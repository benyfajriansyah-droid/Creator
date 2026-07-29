"use client";

import { buttonStyles } from "@/components/ui";

export default function DeleteButton({
  action,
  label = "Hapus",
  confirmMessage = "Hapus konten ini? Tindakan ini tidak bisa dibatalkan.",
}: {
  action: () => void;
  label?: string;
  confirmMessage?: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!confirm(confirmMessage)) event.preventDefault();
      }}
    >
      <button type="submit" className={buttonStyles.danger}>
        {label}
      </button>
    </form>
  );
}
