"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { requireUser } from "@/lib/auth";
import { createResetToken } from "@/lib/password-reset";
import { activatePlanForEmail, isAdmin } from "@/lib/billing";

export type ActivateState = { error?: string; success?: string };

/**
 * Operator-only. Payment is collected on lynk.id, which tells the app nothing,
 * so a paid customer is joined to their account here by email.
 */
export async function activatePlan(
  _prev: ActivateState,
  formData: FormData
): Promise<ActivateState> {
  const user = await requireUser();
  if (!isAdmin(user.email)) return { error: "Tidak diizinkan." };

  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "Email wajib diisi." };

  const plan = formData.get("plan");
  if (plan !== "PRO" && plan !== "FREE") return { error: "Plan tidak valid." };

  try {
    const target = await activatePlanForEmail(email, plan);
    revalidatePath("/admin/plans");
    return {
      success:
        plan === "FREE"
          ? `${target.name} (${target.email}) dikembalikan ke plan Gratis.`
          : `${target.name} (${target.email}) sekarang aktif di plan Pro selama 30 hari.`,
    };
  } catch (error) {
    console.error("Gagal mengaktifkan plan", error);
    return { error: error instanceof Error ? error.message : "Gagal mengaktifkan plan." };
  }
}

export type ResetLinkState = { error?: string; link?: string };

/**
 * Operator-only escape hatch for when automatic email isn't set up: produces
 * the same reset link the mail would have carried, to hand over another way.
 * Deliberately reports a missing account, unlike the public form — the admin
 * needs to know they typed the wrong address.
 */
export async function createResetLink(
  _prev: ResetLinkState,
  formData: FormData
): Promise<ResetLinkState> {
  const user = await requireUser();
  if (!isAdmin(user.email)) return { error: "Tidak diizinkan." };

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) return { error: "Email wajib diisi." };

  const token = await createResetToken(email);
  if (!token) return { error: `Belum ada akun dengan email ${email}` };

  const host = (await headers()).get("host") ?? "localhost:3000";
  const local = host.startsWith("localhost") || host.startsWith("127.0.0.1");
  return { link: `${local ? "http" : "https"}://${host}/reset-password?token=${token}` };
}
