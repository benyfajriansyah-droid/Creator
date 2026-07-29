import type { ContentStatus, Platform } from "@prisma/client";
import type { Tone } from "@/components/ui";

export const PLATFORM_LABEL: Record<Platform, string> = {
  YOUTUBE: "YouTube",
  INSTAGRAM: "Instagram",
  TIKTOK: "TikTok",
  TWITTER: "X / Twitter",
  LINKEDIN: "LinkedIn",
  FACEBOOK: "Facebook",
  OTHER: "Lainnya",
};

export const PLATFORMS = Object.keys(PLATFORM_LABEL) as Platform[];

export const STATUS_LABEL: Record<ContentStatus, string> = {
  IDEA: "Ide",
  DRAFT: "Digarap",
  READY: "Siap Posting",
  SCHEDULED: "Terjadwal",
  PUBLISHED: "Tayang",
};

/** Pipeline order, used by the board columns and status pickers. */
export const STATUSES: ContentStatus[] = [
  "IDEA",
  "DRAFT",
  "READY",
  "SCHEDULED",
  "PUBLISHED",
];

export const STATUS_TONE: Record<ContentStatus, Tone> = {
  IDEA: "neutral",
  DRAFT: "warning",
  READY: "info",
  SCHEDULED: "accent",
  PUBLISHED: "success",
};

export const CONTENT_TYPES = [
  "Video Panjang",
  "Short / Reel",
  "Carousel",
  "Single Post",
  "Story",
  "Livestream",
  "Artikel",
  "Podcast",
  "Lainnya",
];

export const ACCOUNT_COLORS = [
  "#4f46e5",
  "#0ea5e9",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#ec4899",
  "#8b5cf6",
  "#14b8a6",
];

/** Checklist seeded onto every new content item so the workflow is visible. */
export const DEFAULT_CHECKLIST = [
  "Riset & tentukan hook",
  "Tulis script / outline",
  "Shooting / produksi",
  "Editing",
  "Tulis caption & hashtag",
  "Siapkan thumbnail / cover",
];

const JAKARTA = "Asia/Jakarta";

export function formatDateTime(date: Date | string | null, timeZone = JAKARTA): string {
  if (!date) return "—";
  return new Date(date).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  });
}

export function formatDate(date: Date | string | null, timeZone = JAKARTA): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone,
  });
}

export function formatTime(date: Date | string | null, timeZone = JAKARTA): string {
  if (!date) return "—";
  return new Date(date).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  });
}

/** Human "in 3 hari" / "2 jam lalu" phrasing for schedule cards. */
export function relativeTime(date: Date | string | null): string {
  if (!date) return "—";
  const target = new Date(date).getTime();
  const diffMs = target - Date.now();
  const abs = Math.abs(diffMs);
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;

  const fmt = (value: number, unit: string) =>
    diffMs >= 0 ? `dalam ${value} ${unit}` : `${value} ${unit} lalu`;

  if (abs < minute) return diffMs >= 0 ? "sebentar lagi" : "baru saja";
  if (abs < hour) return fmt(Math.round(abs / minute), "menit");
  if (abs < day) return fmt(Math.round(abs / hour), "jam");
  if (abs < 30 * day) return fmt(Math.round(abs / day), "hari");
  return formatDate(date);
}

export function formatNumber(value: number): string {
  return value.toLocaleString("id-ID");
}

export function formatRupiah(value: number): string {
  return `Rp${value.toLocaleString("id-ID")}`;
}

/**
 * Converts a Date into the `value` a <input type="datetime-local"> expects,
 * rendered in the given time zone rather than the server's.
 */
export function toDatetimeLocalValue(
  date: Date | string | null,
  timeZone = JAKARTA
): string {
  if (!date) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(date));

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}
