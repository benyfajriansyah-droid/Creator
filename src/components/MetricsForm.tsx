"use client";

import { useFormStatus } from "react-dom";
import type { ContentItem } from "@prisma/client";
import { Field, buttonStyles, inputStyles } from "@/components/ui";
import { toDatetimeLocalValue } from "@/lib/constants";

const FIELDS: { name: keyof ContentItem; label: string; step?: string }[] = [
  { name: "views", label: "Views" },
  { name: "likes", label: "Likes" },
  { name: "comments", label: "Komentar" },
  { name: "shares", label: "Shares" },
  { name: "saves", label: "Saves" },
  { name: "hoursSpent", label: "Jam dikerjakan", step: "0.5" },
];

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={buttonStyles.primary}>
      {pending ? "Menyimpan…" : "Simpan Performa"}
    </button>
  );
}

export default function MetricsForm({
  item,
  action,
  timeZone,
}: {
  item: ContentItem;
  action: (formData: FormData) => void;
  timeZone: string;
}) {
  return (
    <form action={action} className="space-y-4">
      <Field label="Tanggal tayang">
        <input
          type="datetime-local"
          name="publishedAt"
          defaultValue={toDatetimeLocalValue(item.publishedAt ?? new Date(), timeZone)}
          className={inputStyles}
        />
      </Field>

      <Field label="Link postingan">
        <input
          type="url"
          name="postUrl"
          defaultValue={item.postUrl ?? ""}
          placeholder="https://…"
          className={inputStyles}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        {FIELDS.map((field) => (
          <Field key={field.name} label={field.label}>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step={field.step ?? "1"}
              name={field.name}
              defaultValue={(item[field.name] as number | null) ?? ""}
              placeholder="0"
              className={inputStyles}
            />
          </Field>
        ))}
      </div>

      <Field label="Revenue (Rp)" hint="Pemasukan langsung dari konten ini, kalau ada.">
        <input
          type="number"
          inputMode="numeric"
          min={0}
          step="1000"
          name="revenue"
          defaultValue={item.revenue ?? ""}
          placeholder="0"
          className={inputStyles}
        />
      </Field>

      <SubmitButton />
      <p className="text-xs text-[var(--text-muted)]">
        Menyimpan ini otomatis menandai konten sebagai sudah tayang.
      </p>
    </form>
  );
}
