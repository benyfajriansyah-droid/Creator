"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { deleteOwnAccount } from "@/app/account-actions";
import { buttonStyles, Field, inputStyles } from "@/components/ui";

function DeleteButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={buttonStyles.danger}>
      {pending ? "Menghapus…" : "Hapus akun permanen"}
    </button>
  );
}

export default function DeleteAccountForm() {
  const [state, action] = useActionState(deleteOwnAccount, {});

  return (
    <form action={action} className="space-y-3">
      <p className="text-sm text-[var(--text-muted)]">
        Semua konten, metrik, percakapan AI, dan pengaturan akan dihapus permanen.
        Unduh data dulu kalau masih dibutuhkan.
      </p>
      <Field label="Password akun">
        <input
          type="password"
          name="password"
          required
          autoComplete="current-password"
          className={inputStyles}
        />
      </Field>
      <Field label='Konfirmasi dengan mengetik "HAPUS"'>
        <input
          name="confirmation"
          required
          autoComplete="off"
          className={inputStyles}
        />
      </Field>
      {state.error && <p className="text-sm text-[var(--danger)]">{state.error}</p>}
      <DeleteButton />
    </form>
  );
}
