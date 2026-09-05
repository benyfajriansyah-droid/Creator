import type { Plan } from "@prisma/client";

export const PAID_PERIOD_DAYS = 30;

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

export function isPaidPlanExpired(
  plan: Plan,
  planRenewsAt: Date | null,
  now = new Date()
): boolean {
  return plan !== "FREE" && (!planRenewsAt || planRenewsAt.getTime() <= now.getTime());
}

/** Renewing early adds 30 days after the current period instead of deleting paid days. */
export function nextPaidPeriodEnd(
  currentEnd: Date | null,
  now = new Date()
): Date {
  const startsAt = currentEnd && currentEnd > now ? currentEnd : now;
  return addDays(startsAt, PAID_PERIOD_DAYS);
}
