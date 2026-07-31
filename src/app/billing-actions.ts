"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
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
