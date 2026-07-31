import "server-only";
import type { Plan, User } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const QUOTA_PERIOD_DAYS = 30;

/**
 * Payment happens entirely on lynk.id — this is a public product link, not a
 * secret, so it lives in code rather than an environment variable and works
 * the moment it's deployed. Change it here if the product is recreated.
 */
export const LYNK_CHECKOUT_URL =
  "https://lynk.id/projectheyben/oyqm79ozgkkd/checkout";

/**
 * Only FREE and PRO are sold. STUDIO stays in the Prisma enum because
 * removing an enum value means recreating the type in Postgres, and a failed
 * migration takes the whole deployment down — it just isn't offered anywhere.
 */
export const SOLD_PLANS = ["FREE", "PRO"] as const;

/** Monthly AI action quota per plan. 0 means the plan has no AI access. */
export const PLAN_AI_QUOTA: Record<Plan, number> = {
  FREE: 0,
  PRO: 200,
  STUDIO: 200,
};

/** Price in IDR, charged every QUOTA_PERIOD_DAYS. */
export const PLAN_PRICE: Record<Plan, number> = {
  FREE: 0,
  PRO: 99_000,
  STUDIO: 99_000,
};

export const PLAN_LABEL: Record<Plan, string> = {
  FREE: "Gratis",
  PRO: "Pro",
  STUDIO: "Studio",
};

/** Whether this user is the app operator, allowed to activate paid plans. */
export function isAdmin(email: string): boolean {
  const adminEmail = process.env.ADMIN_EMAIL;
  return Boolean(adminEmail) && email.toLowerCase() === adminEmail!.toLowerCase();
}

/**
 * Quota is only enforced once there's someone who can lift it. Without
 * ADMIN_EMAIL nobody can reach /admin/plans to activate a paying customer, so
 * enforcing would lock every account out of the AI with no way back in.
 */
export function isMonetizationLive(): boolean {
  return Boolean(process.env.ADMIN_EMAIL);
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

/**
 * Operator-only: puts an account on a paid plan after its payment has landed
 * on lynk.id. The app never sees that payment — lynk.id takes the money and
 * tells nobody — so this is the one place the two sides get joined up, and it
 * records an Order so there's a history of who was activated and when.
 */
export async function activatePlanForEmail(
  email: string,
  plan: Plan
): Promise<{ name: string; email: string }> {
  const normalised = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: normalised } });
  if (!user) throw new Error(`Belum ada akun dengan email ${normalised}`);

  const now = new Date();
  const until = addDays(now, QUOTA_PERIOD_DAYS);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: {
        plan,
        planRenewsAt: plan === "FREE" ? null : until,
        aiQuotaUsed: 0,
        aiQuotaResetAt: until,
      },
    }),
    prisma.order.create({
      data: {
        userId: user.id,
        plan,
        amount: PLAN_PRICE[plan],
        status: "PAID",
        provider: "lynk",
        paidAt: now,
      },
    }),
  ]);

  return { name: user.name, email: user.email };
}
