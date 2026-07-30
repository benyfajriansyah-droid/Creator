import "server-only";
import type { Plan, User } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const QUOTA_PERIOD_DAYS = 30;

/** Monthly AI action quota per plan. 0 means the plan has no AI access. */
export const PLAN_AI_QUOTA: Record<Plan, number> = {
  FREE: 0,
  PRO: 60,
  STUDIO: 200,
};

/** Price in IDR, charged every QUOTA_PERIOD_DAYS. */
export const PLAN_PRICE: Record<Plan, number> = {
  FREE: 0,
  PRO: 49_000,
  STUDIO: 99_000,
};

export const PLAN_LABEL: Record<Plan, string> = {
  FREE: "Gratis",
  PRO: "Pro",
  STUDIO: "Studio",
};

export type PlanUpgrade = Exclude<Plan, "FREE">;

/**
 * Quota enforcement only kicks in once a payment gateway is actually wired
 * up — before that, AI stays unlimited for everyone (same philosophy as
 * isAiConfigured()), so shipping this doesn't lock out the app's own users
 * before there's any way for them to pay.
 */
export function isBillingConfigured(): boolean {
  return Boolean(process.env.LYNK_PRO_URL || process.env.LYNK_STUDIO_URL);
}

/** Manual transfer (e.g. GoPay) as a payment option, with the operator confirming by hand. */
export function isManualPaymentConfigured(): boolean {
  return Boolean(process.env.MANUAL_PAYMENT_GOPAY_NUMBER);
}

export function getManualPaymentNumber(): string | null {
  return process.env.MANUAL_PAYMENT_GOPAY_NUMBER ?? null;
}

/** Whether this user is the app operator, allowed to confirm manual payments. */
export function isAdmin(email: string): boolean {
  const adminEmail = process.env.ADMIN_EMAIL;
  return Boolean(adminEmail) && email.toLowerCase() === adminEmail!.toLowerCase();
}

/** True once any way to actually collect payment exists — lynk.id or manual transfer. */
export function isMonetizationLive(): boolean {
  return isBillingConfigured() || isManualPaymentConfigured();
}

export type QuotaStatus = {
  plan: Plan;
  limit: number;
  used: number;
  remaining: number;
  /** True when quota enforcement is actually active (billing configured). */
  enforced: boolean;
};

/**
 * Reads the user's quota, lazily rolling it over if the reset window has
 * passed. Call this before an AI call to check `remaining`, then
 * `consumeAiQuota` after a successful generation.
 */
export async function getQuotaStatus(userId: string): Promise<QuotaStatus> {
  const user = await rolloverQuotaIfNeeded(userId);
  const limit = PLAN_AI_QUOTA[user.plan];
  const enforced = isMonetizationLive();
  return {
    plan: user.plan,
    limit,
    used: user.aiQuotaUsed,
    remaining: enforced ? Math.max(0, limit - user.aiQuotaUsed) : Number.POSITIVE_INFINITY,
    enforced,
  };
}

async function rolloverQuotaIfNeeded(userId: string): Promise<User> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (user.aiQuotaResetAt && user.aiQuotaResetAt > new Date()) return user;

  return prisma.user.update({
    where: { id: userId },
    data: {
      aiQuotaUsed: 0,
      aiQuotaResetAt: addDays(new Date(), QUOTA_PERIOD_DAYS),
    },
  });
}

/** Increments quota usage by one AI action. Call only after a successful generation. */
export async function consumeAiQuota(userId: string): Promise<void> {
  if (!isMonetizationLive()) return;
  await prisma.user.update({
    where: { id: userId },
    data: { aiQuotaUsed: { increment: 1 } },
  });
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

/** Marks an order paid and activates the plan it was for on the order's user. No-op if already paid. */
async function activateOrder(orderId: string): Promise<void> {
  const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
  if (order.status === "PAID") return;

  await prisma.$transaction([
    prisma.order.update({
      where: { id: order.id },
      data: { status: "PAID", paidAt: new Date() },
    }),
    prisma.user.update({
      where: { id: order.userId },
      data: {
        plan: order.plan,
        planRenewsAt: addDays(new Date(), QUOTA_PERIOD_DAYS),
        aiQuotaUsed: 0,
        aiQuotaResetAt: addDays(new Date(), QUOTA_PERIOD_DAYS),
      },
    }),
  ]);
}

/** Creates a pending manual-transfer order for the operator to confirm by hand. */
export async function createManualOrder(userId: string, plan: PlanUpgrade): Promise<void> {
  await prisma.order.create({
    data: { userId, plan, amount: PLAN_PRICE[plan], status: "PENDING", provider: "manual" },
  });
}

/** Operator-only: confirms a pending manual order and activates the plan. */
export async function confirmManualOrder(orderId: string): Promise<void> {
  const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
  if (order.provider !== "manual") throw new Error("Bukan order transfer manual");
  await activateOrder(order.id);
}

/**
 * lynk.id sells the plans as ordinary products: you create one product per
 * paid plan in the lynk.id dashboard and paste its checkout link here. There
 * is no API call to make — buyers are sent to the link, and lynk.id posts to
 * our webhook once they've paid.
 */
export function getLynkCheckoutUrl(plan: PlanUpgrade): string | null {
  const url =
    plan === "PRO" ? process.env.LYNK_PRO_URL : process.env.LYNK_STUDIO_URL;
  return url || null;
}

/** Records the pending order and hands back where to send the buyer. */
export async function startLynkCheckout(
  userId: string,
  plan: PlanUpgrade
): Promise<string> {
  const url = getLynkCheckoutUrl(plan);
  if (!url) throw new Error(`Link pembayaran ${PLAN_LABEL[plan]} belum diatur`);

  await prisma.order.create({
    data: { userId, plan, amount: PLAN_PRICE[plan], status: "PENDING", provider: "lynk" },
  });

  return url;
}

/**
 * Applies a lynk.id webhook.
 *
 * lynk.id's docs aren't reachable from here, so rather than guessing at one
 * exact payload shape this reads the buyer's email and the payment status from
 * whatever plausible keys the payload happens to use, at any nesting depth.
 *
 * The safety property that matters: a plan is only ever granted when the
 * payload clearly reads as paid AND the email matches a user who has a pending
 * lynk order waiting. Anything short of that is logged and left pending, for
 * the operator to confirm by hand at /admin/orders — so an unrecognised payload
 * can never hand out a paid plan by accident.
 */
export async function applyLynkWebhookPayload(payload: unknown): Promise<void> {
  const email = findValue(payload, EMAIL_KEYS);
  const status = findValue(payload, STATUS_KEYS) ?? "";

  if (!email) {
    console.warn("lynk webhook: tidak ada email pembeli di payload", payload);
    return;
  }
  if (!PAID_PATTERN.test(status)) {
    console.info("lynk webhook: status belum lunas, dibiarkan pending", { email, status });
    return;
  }

  const order = await prisma.order.findFirst({
    where: {
      status: "PENDING",
      provider: "lynk",
      user: { email: email.trim().toLowerCase() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!order) {
    console.warn("lynk webhook: tidak ada order pending untuk email ini", email);
    return;
  }

  await activateOrder(order.id);
}

const EMAIL_KEYS = ["email", "customeremail", "buyeremail", "customer_email", "buyer_email"];
const STATUS_KEYS = ["status", "paymentstatus", "payment_status", "event", "transactionstatus"];
const PAID_PATTERN = /paid|success|settlement|complete|lunas|berhasil/i;

/**
 * Depth-first search for the first string sitting under any of `keys`,
 * comparing key names case- and separator-insensitively.
 */
function findValue(node: unknown, keys: string[], depth = 0): string | undefined {
  if (depth > 6 || node === null || typeof node !== "object") return undefined;

  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findValue(item, keys, depth + 1);
      if (found) return found;
    }
    return undefined;
  }

  for (const [key, value] of Object.entries(node)) {
    const normalised = key.toLowerCase().replace(/[^a-z]/g, "");
    if (keys.some((k) => k.replace(/[^a-z]/g, "") === normalised)) {
      if (typeof value === "string" && value.trim()) return value.trim();
    }
  }

  for (const value of Object.values(node)) {
    const found = findValue(value, keys, depth + 1);
    if (found) return found;
  }

  return undefined;
}
