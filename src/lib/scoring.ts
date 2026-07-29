import type { ContentItem } from "@prisma/client";
import type { Tone } from "@/components/ui";

export type Verdict = "WORTH_IT" | "AVERAGE" | "NOT_WORTH_IT" | "NO_DATA";

export type ScoredContent = {
  engagementRate: number | null;
  revenuePerHour: number | null;
  /** How this item's engagement compares to the baseline, e.g. 1.3 = 30% above. */
  vsAverage: number | null;
  verdict: Verdict;
};

export function engagementRateOf(item: ContentItem): number | null {
  if (!item.views || item.views <= 0) return null;
  const interactions =
    (item.likes ?? 0) + (item.comments ?? 0) + (item.shares ?? 0) + (item.saves ?? 0);
  return interactions / item.views;
}

/**
 * Classifies each published item as worth it / average / not worth it by
 * comparing its engagement rate against the average across published items.
 * Needs at least two measured items before it will call anything, so a single
 * post is never judged against itself.
 */
export function scoreContent(items: ContentItem[]): Map<string, ScoredContent> {
  const rates = items
    .filter((i) => i.status === "PUBLISHED")
    .map(engagementRateOf)
    .filter((r): r is number => r !== null);

  const avg = rates.length > 0 ? rates.reduce((a, b) => a + b, 0) / rates.length : null;
  const hasBaseline = rates.length >= 2 && avg !== null && avg > 0;

  const result = new Map<string, ScoredContent>();

  for (const item of items) {
    const engagementRate = engagementRateOf(item);
    const revenuePerHour =
      item.revenue != null && item.hoursSpent && item.hoursSpent > 0
        ? item.revenue / item.hoursSpent
        : null;

    const vsAverage =
      hasBaseline && engagementRate !== null ? engagementRate / avg : null;

    let verdict: Verdict = "NO_DATA";
    if (item.status === "PUBLISHED" && vsAverage !== null) {
      if (vsAverage >= 1.2) verdict = "WORTH_IT";
      else if (vsAverage >= 0.8) verdict = "AVERAGE";
      else verdict = "NOT_WORTH_IT";
    }

    result.set(item.id, { engagementRate, revenuePerHour, vsAverage, verdict });
  }

  return result;
}

export const VERDICT_LABEL: Record<Verdict, string> = {
  WORTH_IT: "Worth It",
  AVERAGE: "Rata-rata",
  NOT_WORTH_IT: "Kurang Worth It",
  NO_DATA: "Belum Ada Data",
};

export const VERDICT_TONE: Record<Verdict, Tone> = {
  WORTH_IT: "success",
  AVERAGE: "warning",
  NOT_WORTH_IT: "danger",
  NO_DATA: "neutral",
};

export function formatEngagement(rate: number | null): string {
  if (rate === null) return "—";
  return `${(rate * 100).toFixed(1)}%`;
}
