import type { ContentItem } from "@prisma/client";
import { engagementRateOf } from "@/lib/scoring";

/**
 * Twenty-four hourly buckets would leave roughly one post in each for most
 * creators, which says nothing. Blocks are coarse enough that a handful of
 * posts can still show a pattern.
 */
export const TIME_BLOCKS = [
  { key: "pagi", label: "Pagi", range: "05–10", from: 5, to: 10 },
  { key: "siang", label: "Siang", range: "11–14", from: 11, to: 14 },
  { key: "sore", label: "Sore", range: "15–18", from: 15, to: 18 },
  { key: "malam", label: "Malam", range: "19–22", from: 19, to: 22 },
  { key: "larut", label: "Larut malam", range: "23–04", from: 23, to: 4 },
] as const;

export const DAY_LABELS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

/** Below this there isn't enough measured content to claim a pattern at all. */
const MIN_TOTAL = 6;
/** A bucket needs at least this many posts before it's worth ranking. */
const MIN_PER_BUCKET = 2;

export type TimingBucket = {
  key: string;
  label: string;
  /** Extra context for a block, e.g. the hours it covers. */
  detail?: string;
  count: number;
  avgEngagement: number;
  /** Ratio against the creator's overall average; 1.3 = 30% better. */
  vsAverage: number;
  /** False when the bucket is too thin to draw a conclusion from. */
  ranked: boolean;
};

export type TimingInsight = {
  enough: boolean;
  sampleSize: number;
  overallAverage: number;
  byBlock: TimingBucket[];
  byDay: TimingBucket[];
  bestBlock: TimingBucket | null;
  bestDay: TimingBucket | null;
};

function blockOf(hour: number): (typeof TIME_BLOCKS)[number] {
  for (const block of TIME_BLOCKS) {
    // The late block wraps past midnight, so it's tested the other way round.
    const inside =
      block.from <= block.to
        ? hour >= block.from && hour <= block.to
        : hour >= block.from || hour <= block.to;
    if (inside) return block;
  }
  return TIME_BLOCKS[TIME_BLOCKS.length - 1];
}

/** Weekday (0 = Sunday) and hour of a UTC instant, read in `timeZone`. */
function localParts(date: Date, timeZone: string): { weekday: number; hour: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const weekdayName = parts.find((p) => p.type === "weekday")?.value ?? "Sun";
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0) % 24;
  const index = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(weekdayName);

  return { weekday: index === -1 ? 0 : index, hour };
}

/**
 * Works out when this creator's own posts have done best. Everything is
 * measured against their own average rather than any general advice about
 * posting times, and it refuses to conclude anything from too little data.
 */
export function analysePostingTimes(
  items: ContentItem[],
  timeZone: string
): TimingInsight {
  const measured = items
    .filter((item) => item.status === "PUBLISHED" && item.publishedAt)
    .map((item) => ({ item, rate: engagementRateOf(item) }))
    .filter((entry): entry is { item: ContentItem; rate: number } => entry.rate !== null);

  const overallAverage =
    measured.length > 0
      ? measured.reduce((sum, e) => sum + e.rate, 0) / measured.length
      : 0;

  const collect = (
    keyOf: (date: Date) => { key: string; label: string; detail?: string }
  ): TimingBucket[] => {
    const groups = new Map<string, { label: string; detail?: string; total: number; count: number }>();

    for (const { item, rate } of measured) {
      const { key, label, detail } = keyOf(item.publishedAt!);
      const group = groups.get(key) ?? { label, detail, total: 0, count: 0 };
      group.total += rate;
      group.count += 1;
      groups.set(key, group);
    }

    return [...groups.entries()]
      .map(([key, g]) => {
        const avgEngagement = g.total / g.count;
        return {
          key,
          label: g.label,
          detail: g.detail,
          count: g.count,
          avgEngagement,
          vsAverage: overallAverage > 0 ? avgEngagement / overallAverage : 1,
          ranked: g.count >= MIN_PER_BUCKET,
        };
      })
      .sort((a, b) => b.avgEngagement - a.avgEngagement);
  };

  const byBlock = collect((date) => {
    const block = blockOf(localParts(date, timeZone).hour);
    return { key: block.key, label: block.label, detail: `jam ${block.range}` };
  });

  const byDay = collect((date) => {
    const weekday = localParts(date, timeZone).weekday;
    return { key: String(weekday), label: DAY_LABELS[weekday] };
  });

  const enough = measured.length >= MIN_TOTAL;
  const pickBest = (buckets: TimingBucket[]) =>
    (enough && buckets.find((b) => b.ranked)) || null;

  return {
    enough,
    sampleSize: measured.length,
    overallAverage,
    byBlock,
    byDay,
    bestBlock: pickBest(byBlock),
    bestDay: pickBest(byDay),
  };
}
