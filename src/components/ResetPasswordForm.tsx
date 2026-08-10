"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { resetPassword, type ResetPasswordState } from "@/app/auth-actions";
import { Card, Field, buttonStyles, inputStyles } from "@/components/ui";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={`${buttonStyles.primary} w-full`}>
      {pending ? "Menyimpan…" : "Simpan password baru"}
    </button>
  );
}

export default function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction] = useActionState<ResetPasswordState, FormData>(
    resetPassword,
    {}
  );
  const [show, setShow] = useState(false);

  return (
    <Card className="p-6">
      <h1 className="text-xl font-semibold tracking-tight">Password baru</h1>
      <p className="mt-1 mb-5 text-sm text-[var(--text-muted)]">
        Pilih password baru untuk akunmu. Minimal 8 karakter.
      </p>

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="token" value={token} />

        <Field label="Password baru">
          <input
            type={show ? "text" : "password"}
            name="password"
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="••••••••"
            className={inputStyles}
          />
        </Field>

        <Field label="Ulangi password baru">
          <input
            type={show ? "text" : "password"}
            name="confirm"
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="••••••••"
            className={inputStyles}
          />
        </Field>

        <label className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
          <input
            type="checkbox"
            checked={show}
            onChange={(e) => setShow(e.target.checked)}
            className="size-4 accent-[var(--accent)]"
          />
          Tampilkan password
        </label>

        {state.error && (
          <p className="rounded-lg border border-[var(--danger-border)] bg-[var(--danger-bg)] px-3 py-2 text-sm text-[var(--danger)]">
            {state.error}
          </p>
        )}

        <SubmitButton />
      </form>
    </Card>
  );
}
