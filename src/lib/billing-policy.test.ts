import { describe, expect, it } from "vitest";
import { addDays, isPaidPlanExpired, nextPaidPeriodEnd } from "@/lib/billing-policy";

describe("billing policy", () => {
  const now = new Date("2026-09-05T00:00:00.000Z");

  it("never expires the free plan", () => {
    expect(isPaidPlanExpired("FREE", null, now)).toBe(false);
  });

  it("expires a paid plan at its exact end time", () => {
    expect(isPaidPlanExpired("PRO", new Date(now), now)).toBe(true);
  });

  it("treats a paid plan without an end date as invalid", () => {
    expect(isPaidPlanExpired("PRO", null, now)).toBe(true);
  });

  it("preserves remaining paid days when renewed early", () => {
    const currentEnd = addDays(now, 10);
    expect(nextPaidPeriodEnd(currentEnd, now)).toEqual(addDays(now, 40));
  });

  it("starts a late renewal from now", () => {
    expect(nextPaidPeriodEnd(addDays(now, -2), now)).toEqual(addDays(now, 30));
  });
});
