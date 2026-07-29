import type { Platform } from "@prisma/client";
import { ACCOUNT_COLORS } from "@/lib/constants";

/**
 * New sign-ups start with a couple of placeholder accounts so the dashboard,
 * calendar and board aren't blank walls on the first visit. They're editable
 * and deletable like any other account.
 */
export const DEFAULT_ACCOUNT_SEED: {
  label: string;
  platform: Platform;
  color: string;
}[] = [
  { label: "Instagram Utama", platform: "INSTAGRAM", color: ACCOUNT_COLORS[0] },
  { label: "TikTok", platform: "TIKTOK", color: ACCOUNT_COLORS[1] },
];
