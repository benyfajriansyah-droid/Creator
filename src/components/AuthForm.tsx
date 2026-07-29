"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { AuthState } from "@/app/auth-actions";
import { Card, Field, buttonStyles, inputStyles } from "@/components/ui";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={`${buttonStyles.primary} w-full`}>
      {pending ? "Memproses…" : label}
    </button>
  );
}

export default function AuthForm({
  mode,
  action,
}: {
  mode: "login" | "register";
  action: (state: AuthState, formData: FormData) => Promise<AuthState>;
}) {
  const [state, formAction] = useActionState(action, {});
  const isRegister = mode === "register";

  return (
    <Card className="p-6">
      <h1 className="text-xl font-semibold tracking-tight">
        {isRegister ? "Buat akun" : "Masuk"}
      </h1>
      <p className="mt-1 mb-5 text-sm text-[var(--text-muted)]">
        {isRegister
          ? "Mulai kelola konten kamu dalam satu tempat."
          : "Selamat datang kembali."}
      </p>

      <form action={formAction} className="space-y-4">
        {isRegister && (
          <Field label="Nama">
            <input
              name="name"
              required
              autoComplete="name"
              placeholder="Nama kamu"
              className={inputStyles}
            />
          </Field>
        )}

        <Field label="Email">
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            placeholder="kamu@email.com"
            className={inputStyles}
          />
        </Field>

        <Field
          label="Password"
          hint={isRegister ? "Minimal 8 karakter." : undefined}
        >
          <input
            type="password"
            name="password"
            required
            minLength={isRegister ? 8 : undefined}
            autoComplete={isRegister ? "new-password" : "current-password"}
            placeholder="••••••••"
            className={inputStyles}
          />
        </Field>

        {state.error && (
          <p className="rounded-lg border border-[var(--danger-border)] bg-[var(--danger-bg)] px-3 py-2 text-sm text-[var(--danger)]">
            {state.error}
          </p>
        )}

        <SubmitButton label={isRegister ? "Buat akun" : "Masuk"} />
      </form>

      <p className="mt-5 text-center text-sm text-[var(--text-muted)]">
        {isRegister ? "Sudah punya akun? " : "Belum punya akun? "}
        <Link
          href={isRegister ? "/login" : "/register"}
          className="font-medium text-[var(--accent)] hover:underline"
        >
          {isRegister ? "Masuk" : "Daftar"}
        </Link>
      </p>
    </Card>
  );
}
