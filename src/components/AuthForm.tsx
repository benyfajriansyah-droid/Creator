"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
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
  justReset = false,
  redirectTo,
}: {
  mode: "login" | "register";
  action: (state: AuthState, formData: FormData) => Promise<AuthState>;
  /** Set after a successful password reset, so the redirect explains itself. */
  justReset?: boolean;
  redirectTo?: "/billing";
}) {
  const [state, formAction] = useActionState(action, {});
  const [showPassword, setShowPassword] = useState(false);
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

      {justReset && (
        <p className="mb-5 rounded-lg border border-[var(--success-border)] bg-[var(--success-bg)] px-3 py-2 text-sm text-[var(--success)]">
          Password kamu sudah diganti. Silakan masuk dengan yang baru.
        </p>
      )}

      <form action={formAction} className="space-y-4">
        {redirectTo && <input type="hidden" name="redirectTo" value={redirectTo} />}
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
          action={
            isRegister ? undefined : (
              <Link
                href="/forgot-password"
                className="text-xs font-medium text-[var(--accent)] hover:underline"
              >
                Lupa password?
              </Link>
            )
          }
        >
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              required
              minLength={isRegister ? 8 : undefined}
              autoComplete={isRegister ? "new-password" : "current-password"}
              placeholder="••••••••"
              // Room on the right so long passwords don't run under the toggle.
              className={`${inputStyles} pr-11`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((visible) => !visible)}
              aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
              aria-pressed={showPassword}
              className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-[var(--text-muted)] transition-colors hover:text-[var(--text)]"
            >
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
        </Field>

        {state.error && (
          <p className="rounded-lg border border-[var(--danger-border)] bg-[var(--danger-bg)] px-3 py-2 text-sm text-[var(--danger)]">
            {state.error}
          </p>
        )}

        <SubmitButton label={isRegister ? "Buat akun" : "Masuk"} />
        {isRegister && (
          <p className="text-center text-xs leading-5 text-[var(--text-subtle)]">
            Dengan mendaftar, kamu menyetujui{" "}
            <Link href="/terms" className="underline hover:text-[var(--text)]">
              Syarat Penggunaan
            </Link>{" "}
            dan{" "}
            <Link href="/privacy" className="underline hover:text-[var(--text)]">
              Kebijakan Privasi
            </Link>.
          </p>
        )}
      </form>

      <p className="mt-5 text-center text-sm text-[var(--text-muted)]">
        {isRegister ? "Sudah punya akun? " : "Belum punya akun? "}
        <Link
          href={`${isRegister ? "/login" : "/register"}${redirectTo ? "?next=/billing" : ""}`}
          className="font-medium text-[var(--accent)] hover:underline"
        >
          {isRegister ? "Masuk" : "Daftar"}
        </Link>
      </p>
    </Card>
  );
}

const eyeProps = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function EyeIcon() {
  return (
    <svg {...eyeProps} aria-hidden>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg {...eyeProps} aria-hidden>
      <path d="M10.6 6.1A9.9 9.9 0 0 1 12 6c6 0 9.5 6 9.5 6a17 17 0 0 1-2.7 3.4M6.3 7.6A17 17 0 0 0 2.5 12S6 18 12 18a9.7 9.7 0 0 0 4-.85" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
      <path d="M3 3l18 18" />
    </svg>
  );
}
