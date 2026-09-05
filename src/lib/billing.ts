import "server-only";
import type { Plan, User } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  PAID_PERIOD_DAYS,
  addDays,
  isPaidPlanExpired,
  nextPaidPeriodEnd,
} from "@/lib/billing-policy";

/** Public checkout URL copied from the product created in OrderHero. */
export const ORDERHERO_CHECKOUT_URL =
  process.env.NEXT_PUBLIC_ORDERHERO_CHECKOUT_URL?.trim() ||
  "https://famzcoffee.orderhero.id/form/creator-pro";

// ADMIN_EMAIL remains overridable for future operators. This fallback makes
// the owner's account usable immediately on the current production project.
const ADMIN_EMAIL =
  process.env.ADMIN_EMAIL?.trim().toLowerCase() || "beny.fajriansyah@gmail.com";

const SUPPORT_WHATSAPP =
  process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP?.replace(/\D/g, "") || "62895323408858";

export function paymentConfirmationUrl(email?: string): string {
  const account = email ? ` Email akun saya: ${email}.` : "";
  const message = `Halo Creator Studio, saya sudah menyelesaikan pembayaran Pro melalui OrderHero.${account} Nomor order saya: [ISI NOMOR ORDER]. Mohon bantu verifikasi dan aktivasi akun saya.`;
  return `https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(message)}`;
}

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
  return email.trim().toLowerCase() === ADMIN_EMAIL;
}

/** Quota enforcement is live because the owner account is always configured. */
export function isMonetizationLive(): boolean {
  return Boolean(ADMIN_EMAIL);
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
 * passed. AI routes reserve usage atomically before calling the model.
 */
export async function getQuotaStatus(userId: string): Promise<QuotaStatus> {
  const user = await refreshBillingState(userId);
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

export async function normalizeExpiredPlan(user: User, now = new Date()): Promise<User> {
  if (!isPaidPlanExpired(user.plan, user.planRenewsAt, now)) return user;

  return prisma.user.update({
    where: { id: user.id },
    data: {
      plan: "FREE",
      planRenewsAt: null,
      aiQuotaUsed: 0,
      aiQuotaResetAt: null,
    },
  });
}

async function refreshBillingState(userId: string, now = new Date()): Promise<User> {
  let user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  user = await normalizeExpiredPlan(user, now);

  if (user.plan === "FREE" || (user.aiQuotaResetAt && user.aiQuotaResetAt > now)) {
    return user;
  }

  return prisma.user.update({
    where: { id: user.id },
    data: {
      aiQuotaUsed: 0,
      aiQuotaResetAt: user.planRenewsAt ?? addDays(now, PAID_PERIOD_DAYS),
    },
  });
}

export type AiQuotaReservation = { allowed: boolean; charged: boolean };

/** Reserves one AI action atomically before calling the paid model. */
export async function reserveAiQuota(userId: string): Promise<AiQuotaReservation> {
  if (!isMonetizationLive()) return { allowed: true, charged: false };

  const user = await refreshBillingState(userId);
  const limit = PLAN_AI_QUOTA[user.plan];
  if (limit <= 0) return { allowed: false, charged: false };

  const updated = await prisma.user.updateMany({
    where: {
      id: user.id,
      plan: user.plan,
      planRenewsAt: { gt: new Date() },
      aiQuotaUsed: { lt: limit },
    },
    data: { aiQuotaUsed: { increment: 1 } },
  });

  return { allowed: updated.count === 1, charged: updated.count === 1 };
}

/** Refunds a reservation when the model fails or refuses before producing an answer. */
export async function releaseAiQuota(userId: string, charged: boolean): Promise<void> {
  if (!charged) return;
  await prisma.$executeRaw(Prisma.sql`
    UPDATE "User"
    SET "aiQuotaUsed" = GREATEST("aiQuotaUsed" - 1, 0), "updatedAt" = NOW()
    WHERE "id" = ${userId}
  `);
}

/** Proactively expires inactive paid plans during the daily maintenance run. */
export async function expirePaidPlans(now = new Date()): Promise<number> {
  const result = await prisma.user.updateMany({
    where: {
      plan: { not: "FREE" },
      OR: [{ planRenewsAt: null }, { planRenewsAt: { lte: now } }],
    },
    data: {
      plan: "FREE",
      planRenewsAt: null,
      aiQuotaUsed: 0,
      aiQuotaResetAt: null,
    },
  });
  return result.count;
}

/**
 * Operator-only: puts an account on a paid plan after its payment has landed
 * on OrderHero. Until a signed webhook/API is available, this is the one place
 * the payment and app account are joined by email. It records an Order so
 * there's a history of who was activated and when.
 */
export async function activatePlanForEmail(
  email: string,
  plan: Plan
): Promise<{ name: string; email: string }> {
  if (plan !== "FREE" && plan !== "PRO") throw new Error("Plan tidak dijual.");
  const normalised = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: normalised } });
  if (!user) throw new Error(`Belum ada akun dengan email ${normalised}`);

  const now = new Date();
  const until = plan === "FREE" ? null : nextPaidPeriodEnd(user.planRenewsAt, now);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: {
        plan,
        planRenewsAt: until,
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
        provider: "orderhero",
        paidAt: now,
      },
    }),
  ]);

  return { name: user.name, email: user.email };
}
