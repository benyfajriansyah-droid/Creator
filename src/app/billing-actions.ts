"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import {
  confirmManualOrder,
  createManualOrder,
  createMayarCheckout,
  isAdmin,
  isBillingConfigured,
  isManualPaymentConfigured,
  type PlanUpgrade,
} from "@/lib/billing";
import { headers } from "next/headers";

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

  const host = (await headers()).get("host") ?? "localhost:3000";
  const protocol = host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https";
  const origin = `${protocol}://${host}`;

  let paymentLink: string;
  try {
    const checkout = await createMayarCheckout(user, plan as PlanUpgrade, `${origin}/billing`);
    paymentLink = checkout.paymentLink;
  } catch (error) {
    console.error("Gagal membuat checkout Mayar", error);
    return { error: error instanceof Error ? error.message : "Gagal membuat halaman pembayaran." };
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
