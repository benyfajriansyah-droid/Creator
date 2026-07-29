"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import type { SocialAccount } from "@prisma/client";
import { Field, buttonStyles, inputStyles } from "@/components/ui";
import { ACCOUNT_COLORS, PLATFORMS, PLATFORM_LABEL } from "@/lib/constants";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={buttonStyles.primary}>
      {pending ? "Menyimpan…" : label}
    </button>
  );
}

export default function AccountForm({
  account,
  action,
  submitLabel,
}: {
  account?: SocialAccount;
  action: (formData: FormData) => void;
  submitLabel: string;
}) {
  const [color, setColor] = useState(account?.color ?? ACCOUNT_COLORS[0]);

  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nama akun *">
          <input
            name="label"
            required
            defaultValue={account?.label}
            placeholder="Misal: Instagram Utama"
            className={inputStyles}
          />
        </Field>

        <Field label="Username / handle">
          <input
            name="handle"
            defaultValue={account?.handle ?? ""}
            placeholder="@username"
            className={inputStyles}
          />
        </Field>
      </div>

      <Field label="Platform">
        <select
          name="platform"
          defaultValue={account?.platform ?? "INSTAGRAM"}
          className={inputStyles}
        >
          {PLATFORMS.map((p) => (
            <option key={p} value={p}>
              {PLATFORM_LABEL[p]}
            </option>
          ))}
        </select>
      </Field>

      <fieldset>
        <legend className="mb-1.5 text-sm font-medium">Warna penanda</legend>
        <input type="hidden" name="color" value={color} />
        <div className="flex flex-wrap gap-2">
          {ACCOUNT_COLORS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setColor(option)}
              aria-label={`Pilih warna ${option}`}
              aria-pressed={color === option}
              className={`size-8 rounded-lg transition-transform ${
                color === option
                  ? "ring-2 ring-[var(--text)] ring-offset-2 ring-offset-[var(--surface)]"
                  : "hover:scale-110"
              }`}
              style={{ backgroundColor: option }}
            />
          ))}
        </div>
      </fieldset>

      <SubmitButton label={submitLabel} />
    </form>
  );
}
