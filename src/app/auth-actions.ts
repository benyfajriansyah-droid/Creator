"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  createSession,
  destroySession,
  hashPassword,
  verifyPassword,
} from "@/lib/auth";
import { DEFAULT_ACCOUNT_SEED } from "@/lib/seed";
import { consumeResetToken, createResetToken } from "@/lib/password-reset";
import { isMailConfigured, sendMail } from "@/lib/mail";

export type AuthState = { error?: string };

function readCredentials(formData: FormData) {
  return {
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    password: String(formData.get("password") ?? ""),
    name: String(formData.get("name") ?? "").trim(),
  };
}

export async function register(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const { email, password, name } = readCredentials(formData);

  if (!name) return { error: "Nama wajib diisi." };
  if (!email.includes("@")) return { error: "Format email tidak valid." };
  if (password.length < 8) return { error: "Password minimal 8 karakter." };

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { error: "Email ini sudah terdaftar. Coba masuk saja." };

  const user = await prisma.user.create({
    data: {
      email,
      name,
      passwordHash: await hashPassword(password),
      accounts: { create: DEFAULT_ACCOUNT_SEED },
    },
  });

  await createSession(user.id);
  redirect("/dashboard");
}

export async function login(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const { email, password } = readCredentials(formData);

  const user = await prisma.user.findUnique({ where: { email } });
  // Same message either way so the form can't be used to probe for emails.
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { error: "Email atau password salah." };
  }

  await createSession(user.id);
  redirect("/dashboard");
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect("/login");
}

/** The app's own base URL, for links that have to work from an inbox. */
async function originUrl(): Promise<string> {
  const host = (await headers()).get("host") ?? "localhost:3000";
  const local = host.startsWith("localhost") || host.startsWith("127.0.0.1");
  return `${local ? "http" : "https"}://${host}`;
}

export type ResetRequestState = { done?: boolean; error?: string };

/**
 * Starts a password reset. The reply is deliberately the same whether or not
 * the email belongs to an account — otherwise this form doubles as a way to
 * check who has signed up here.
 */
export async function requestPasswordReset(
  _prev: ResetRequestState,
  formData: FormData
): Promise<ResetRequestState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email.includes("@")) return { error: "Format email tidak valid." };

  const token = await createResetToken(email);

  if (token && isMailConfigured()) {
    const link = `${await originUrl()}/reset-password?token=${token}`;
    await sendMail({
      to: email,
      subject: "Atur ulang password Creator Studio",
      text: `Halo,

Ada permintaan untuk mengatur ulang password akun Creator Studio kamu.
Buka tautan ini untuk memilih password baru:

${link}

Tautannya berlaku 1 jam dan hanya bisa dipakai sekali. Kalau bukan kamu yang
meminta, abaikan saja email ini — passwordmu tidak berubah.`,
    });
  }

  return { done: true };
}

export type ResetPasswordState = { error?: string };

export async function resetPassword(
  _prev: ResetPasswordState,
  formData: FormData
): Promise<ResetPasswordState> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password.length < 8) return { error: "Password minimal 8 karakter." };
  if (password !== confirm) return { error: "Konfirmasi password tidak cocok." };

  const outcome = await consumeResetToken(token, password);

  if (outcome === "EXPIRED") {
    return { error: "Tautannya sudah kedaluwarsa. Minta tautan baru." };
  }
  if (outcome === "USED") {
    return { error: "Tautan ini sudah dipakai. Minta tautan baru." };
  }
  if (outcome === "INVALID") {
    return { error: "Tautannya tidak dikenali. Minta tautan baru." };
  }

  redirect("/login?reset=1");
}
