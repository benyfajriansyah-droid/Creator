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
  return Boolean(process.env.MAYAR_API_KEY);
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

/** True once any way to actually collect payment exists — Mayar or manual transfer. */
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

const MAYAR_API_BASE = "https://api.mayar.id/hl/v1";

type MayarInvoiceResponse = {
  data?: { id?: string; transactionId?: string; link?: string };
};

/**
 * Creates a Mayar payment link for a plan upgrade and records it as a
 * pending Order. Field names follow Mayar's public docs as of writing
 * (name/email/mobile/redirectUrl/items, response data.link + data.id) —
 * Mayar's docs site blocks automated fetches, so this hasn't been verified
 * against a live account. Re-check against a real invoice response before
 * relying on it in production.
 */
export async function createMayarCheckout(
  user: Pick<User, "id" | "name" | "email">,
  plan: PlanUpgrade,
  redirectUrl: string
): Promise<{ paymentLink: string; orderId: string }> {
  const apiKey = process.env.MAYAR_API_KEY;
  if (!apiKey) throw new Error("MAYAR_API_KEY belum diatur");

  const amount = PLAN_PRICE[plan];

  const order = await prisma.order.create({
    data: { userId: user.id, plan, amount, status: "PENDING" },
  });

  const res = await fetch(`${MAYAR_API_BASE}/invoice/create`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: user.name,
      email: user.email,
      mobile: "-",
      description: `Langganan Creator Studio ${PLAN_LABEL[plan]} (30 hari)`,
      redirectUrl,
      items: [
        {
          quantity: 1,
          description: `Langganan ${PLAN_LABEL[plan]}`,
          rate: amount,
        },
      ],
    }),
  });

  if (!res.ok) {
    await prisma.order.update({ where: { id: order.id }, data: { status: "FAILED" } });
    throw new Error(`Mayar menolak permintaan invoice (status ${res.status})`);
  }

  const body = (await res.json()) as MayarInvoiceResponse;
  const paymentLink = body.data?.link;
  const externalId = body.data?.transactionId ?? body.data?.id;

  if (!paymentLink || !externalId) {
    await prisma.order.update({ where: { id: order.id }, data: { status: "FAILED" } });
    throw new Error("Respons Mayar tidak berisi link pembayaran");
  }

  await prisma.order.update({
    where: { id: order.id },
    data: { externalId, paymentLink },
  });

  return { paymentLink, orderId: order.id };
}

/**
 * Applies a webhook notification, matched to its Order by externalId. Trusts
 * the payment status only when it clearly reads as paid — anything
 * ambiguous is logged and left PENDING rather than guessed at, since the
 * exact field names Mayar sends couldn't be confirmed against live docs.
 */
export async function applyMayarWebhookPayload(payload: unknown): Promise<void> {
  const data = extractInvoiceData(payload);
  if (!data?.externalId) {
    console.warn("Mayar webhook: tidak ketemu id transaksi di payload", payload);
    return;
  }

  const order = await prisma.order.findUnique({ where: { externalId: data.externalId } });
  if (!order) {
    console.warn("Mayar webhook: order tidak ditemukan untuk id", data.externalId);
    return;
  }
  if (order.status === "PAID") return;

  if (!data.isPaid) {
    console.info("Mayar webhook: status belum paid, dibiarkan pending", data.status);
    return;
  }

  await activateOrder(order.id);
}

function extractInvoiceData(
  payload: unknown
): { externalId: string; status: string; isPaid: boolean } | null {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as Record<string, unknown>;
  const data = (root.data ?? root) as Record<string, unknown>;

  const externalId = firstString(data.transactionId, data.id, data.invoiceId);
  const status = firstString(data.status, root.event, data.paymentStatus) ?? "";
  if (!externalId) return null;

  const isPaid = /paid|success|settlement|received/i.test(status);
  return { externalId, status, isPaid };
}

function firstString(...values: unknown[]): string | undefined {
  for (const v of values) {
    if (typeof v === "string" && v.length > 0) return v;
  }
  return undefined;
}
