"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import {
  confirmManualOrder,
  createManualOrder,
  isAdmin,
  isBillingConfigured,
  isManualPaymentConfigured,
  startLynkCheckout,
  type PlanUpgrade,
} from "@/lib/billing";

export type CheckoutState = { error?: string };

export async function startCheckout(
  _prev: CheckoutState,
  formData: FormData
): Promise<CheckoutState> {
  const user = await requireUser();

  if (!isBillingConfigured()) {
    return { error: "Pembayaran belum aktif. Coba lagi nanti." };
  }

  const plan = formData.get("plan");
  if (plan !== "PRO" && plan !== "STUDIO") {
    return { error: "Plan tidak valid." };
  }

  let paymentLink: string;
  try {
    paymentLink = await startLynkCheckout(user.id, plan as PlanUpgrade);
  } catch (error) {
    console.error("Gagal memulai checkout lynk.id", error);
    return { error: error instanceof Error ? error.message : "Gagal membuka halaman pembayaran." };
  }

  redirect(paymentLink);
}

export async function requestManualPayment(
  _prev: CheckoutState,
  formData: FormData
): Promise<CheckoutState> {
  const user = await requireUser();

  if (!isManualPaymentConfigured()) {
    return { error: "Pembayaran manual belum aktif." };
  }

  const plan = formData.get("plan");
  if (plan !== "PRO" && plan !== "STUDIO") {
    return { error: "Plan tidak valid." };
  }

  await createManualOrder(user.id, plan as PlanUpgrade);
  revalidatePath("/billing");
  return {};
}

export async function confirmManualPayment(
  _prev: CheckoutState,
  formData: FormData
): Promise<CheckoutState> {
  const user = await requireUser();
  if (!isAdmin(user.email)) {
    return { error: "Tidak diizinkan." };
  }

  const orderId = String(formData.get("orderId") ?? "");
  if (!orderId) return { error: "Order tidak valid." };

  try {
    await confirmManualOrder(orderId);
  } catch (error) {
    console.error("Gagal konfirmasi order manual", error);
    return { error: error instanceof Error ? error.message : "Gagal konfirmasi order." };
  }

  revalidatePath("/admin/orders");
  return {};
}
