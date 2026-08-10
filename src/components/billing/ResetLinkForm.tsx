"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { createResetLink, type ResetLinkState } from "@/app/billing-actions";
import { Field, buttonStyles, inputStyles } from "@/components/ui";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={buttonStyles.secondary}>
      {pending ? "Membuat…" : "Buat tautan reset"}
    </button>
  );
}

export default function ResetLinkForm({ mailEnabled }: { mailEnabled: boolean }) {
  const [state, formAction] = useActionState<ResetLinkState, FormData>(createResetLink, {});
  const [copied, setCopied] = useState(false);

  return (
    <div>
      <p className="mb-4 text-sm text-[var(--text-muted)]">
        {mailEnabled
          ? "Pengiriman email sudah aktif, jadi pengguna bisa reset sendiri lewat halaman Lupa Password. Ini cuma dipakai kalau emailnya tidak sampai."
          : "Pengiriman email belum aktif. Buat tautannya di sini, lalu kirim sendiri ke pengguna lewat WhatsApp atau email."}
      </p>

      <form action={formAction} className="space-y-4">
        <Field label="Email akun">
          <input
            type="email"
            name="email"
            required
            placeholder="klien@email.com"
            className={inputStyles}
          />
        </Field>
        <SubmitButton />
      </form>

      {state.error && (
        <p className="mt-3 rounded-lg border border-[var(--danger-border)] bg-[var(--danger-bg)] px-3 py-2 text-sm text-[var(--danger)]">
          {state.error}
        </p>
      )}

      {state.link && (
        <div className="mt-4">
          <p className="text-xs text-[var(--text-muted)]">
            Berlaku 1 jam, sekali pakai. Membuat tautan baru membatalkan yang lama.
          </p>
          <p className="mt-2 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-3 text-xs break-all">
            {state.link}
          </p>
          <button
            type="button"
            onClick={async () => {
              await navigator.clipboard.writeText(state.link!);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            className={`${buttonStyles.ghost} mt-2`}
          >
            {copied ? "✓ Tersalin" : "Salin tautan"}
          </button>
        </div>
      )}
    </div>
  );
}
