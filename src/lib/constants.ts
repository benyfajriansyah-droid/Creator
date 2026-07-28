import type { ContentStatus, Platform } from "@prisma/client";

export const PLATFORM_LABEL: Record<Platform, string> = {
  YOUTUBE: "YouTube",
  INSTAGRAM: "Instagram",
  TIKTOK: "TikTok",
  TWITTER: "X / Twitter",
  LINKEDIN: "LinkedIn",
  OTHER: "Lainnya",
};

export const PLATFORMS = Object.keys(PLATFORM_LABEL) as Platform[];

export const STATUS_LABEL: Record<ContentStatus, string> = {
  IDEA: "Ide",
  SCHEDULED: "Terjadwal",
  PUBLISHED: "Tayang",
};

export const STATUSES = Object.keys(STATUS_LABEL) as ContentStatus[];

export const STATUS_COLOR: Record<ContentStatus, string> = {
  IDEA: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
  SCHEDULED: "bg-sky-500/15 text-sky-400 border-sky-500/30",
  PUBLISHED: "bg-violet-500/15 text-violet-400 border-violet-500/30",
};

export function formatDateTime(date: Date | string | null): string {
  if (!date) return "-";
  return new Date(date).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDate(date: Date | string | null): string {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function toDatetimeLocalValue(date: Date | string | null): string {
  if (!date) return "";
  const d = new Date(date);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}
