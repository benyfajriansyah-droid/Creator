import type { ContentItem } from "@/generated/prisma/client";

export type Verdict = "WORTH_IT" | "AVERAGE" | "NOT_WORTH_IT" | "NO_DATA";

export type ScoredContent = {
  engagementRate: number | null;
  revenuePerHour: number | null;
  verdict: Verdict;
};

function engagementRateOf(item: ContentItem): number | null {
  if (!item.views || item.views <= 0) return null;
  const interactions =
    (item.likes ?? 0) + (item.comments ?? 0) + (item.shares ?? 0) + (item.saves ?? 0);
  return interactions / item.views;
}

/**
 * Classifies each published item as worth it / average / not worth it by
 * comparing its engagement rate against the average across all published items.
 * Falls back to NO_DATA when there isn't enough info (no views logged yet, or
 * too few published items to have a meaningful baseline).
 */
export function scoreContent(items: ContentItem[]): Map<string, ScoredContent> {
  const published = items.filter((i) => i.status === "PUBLISHED");
  const rates = published
    .map((i) => engagementRateOf(i))
    .filter((r): r is number => r !== null);

  const avg = rates.length > 0 ? rates.reduce((a, b) => a + b, 0) / rates.length : null;

  const result = new Map<string, ScoredContent>();

  for (const item of items) {
    const engagementRate = engagementRateOf(item);
    const revenuePerHour =
      item.revenue != null && item.hoursSpent && item.hoursSpent > 0
        ? item.revenue / item.hoursSpent
        : null;

    let verdict: Verdict = "NO_DATA";
    if (item.status === "PUBLISHED" && engagementRate !== null && avg !== null && rates.length >= 2) {
      if (engagementRate >= avg * 1.2) verdict = "WORTH_IT";
      else if (engagementRate >= avg * 0.8) verdict = "AVERAGE";
      else verdict = "NOT_WORTH_IT";
    }

    result.set(item.id, { engagementRate, revenuePerHour, verdict });
  }

  return result;
}

export const verdictLabel: Record<Verdict, string> = {
  WORTH_IT: "Worth It",
  AVERAGE: "Rata-rata",
  NOT_WORTH_IT: "Kurang Worth It",
  NO_DATA: "Belum Ada Data",
};

export const verdictColor: Record<Verdict, string> = {
  WORTH_IT: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  AVERAGE: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  NOT_WORTH_IT: "bg-rose-500/15 text-rose-400 border-rose-500/30",
  NO_DATA: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
};
