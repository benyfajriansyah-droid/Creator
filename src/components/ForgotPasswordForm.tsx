"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { requestPasswordReset, type ResetRequestState } from "@/app/auth-actions";
import { Card, Field, buttonStyles, inputStyles } from "@/components/ui";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={`${buttonStyles.primary} w-full`}>
      {pending ? "Mengirim…" : "Kirim tautan reset"}
    </button>
  );
}

export default function ForgotPasswordForm({ mailEnabled }: { mailEnabled: boolean }) {
  const [state, formAction] = useActionState<ResetRequestState, FormData>(
    requestPasswordReset,
    {}
  );

  if (state.done) {
    return (
      <Card className="p-6">
        <h1 className="text-xl font-semibold tracking-tight">Cek emailmu</h1>
        <p className="mt-3 text-sm text-[var(--text-muted)]">
          {mailEnabled
            ? "Kalau email itu terdaftar, tautan untuk mengatur ulang password sudah dikirim ke sana. Tautannya berlaku 1 jam."
            : "Permintaanmu tercatat. Pengiriman email otomatis belum aktif di aplikasi ini, jadi hubungi admin untuk mendapatkan tautan resetnya."}
        </p>
        <Link
          href="/login"
          className={`${buttonStyles.secondary} mt-5 w-full justify-center`}
        >
          Kembali ke halaman masuk
        </Link>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h1 className="text-xl font-semibold tracking-tight">Lupa password</h1>
      <p className="mt-1 mb-5 text-sm text-[var(--text-muted)]">
        Masukkan emailmu, nanti dikirimi tautan untuk memilih password baru.
      </p>

      <form action={formAction} className="space-y-4">
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

        {state.error && (
          <p className="rounded-lg border border-[var(--danger-border)] bg-[var(--danger-bg)] px-3 py-2 text-sm text-[var(--danger)]">
            {state.error}
          </p>
        )}

        <SubmitButton />
      </form>

      <p className="mt-5 text-center text-sm text-[var(--text-muted)]">
        Ingat passwordmu?{" "}
        <Link href="/login" className="font-medium text-[var(--accent)] hover:underline">
          Masuk
        </Link>
      </p>
    </Card>
  );
}
