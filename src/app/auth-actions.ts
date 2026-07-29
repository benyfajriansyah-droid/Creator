"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  createSession,
  destroySession,
  hashPassword,
  verifyPassword,
} from "@/lib/auth";
import { DEFAULT_ACCOUNT_SEED } from "@/lib/seed";

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
  redirect("/");
}

export async function login(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const { email, password } = readCredentials(formData);

  const user = await prisma.user.findUnique({ where: { email } });
  // Same message either way so the form can't be used to probe for emails.
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { error: "Email atau password salah." };
  }

  await createSession(user.id);
  redirect("/");
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect("/login");
}
