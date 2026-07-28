"use client";

import type { ContentItem } from "@prisma/client";
import { toDatetimeLocalValue } from "@/lib/constants";

const fields: { name: keyof ContentItem; label: string; step?: string }[] = [
  { name: "views", label: "Views / Impressions" },
  { name: "likes", label: "Likes" },
  { name: "comments", label: "Komentar" },
  { name: "shares", label: "Shares" },
  { name: "saves", label: "Saves" },
  { name: "hoursSpent", label: "Jam Dikerjakan", step: "0.5" },
  { name: "revenue", label: "Revenue (Rp)", step: "1000" },
];

export default function MetricsForm({
  item,
  action,
}: {
  item: ContentItem;
  action: (formData: FormData) => void;
}) {
  return (
    <form action={action} className="flex flex-col gap-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-300">Tanggal Tayang</label>
        <input
          type="datetime-local"
          name="publishedAt"
          defaultValue={toDatetimeLocalValue(item.publishedAt ?? new Date())}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-zinc-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {fields.map((f) => (
          <div key={f.name}>
            <label className="mb-1 block text-sm font-medium text-zinc-300">{f.label}</label>
            <input
              type="number"
              step={f.step ?? "1"}
              min={0}
              name={f.name}
              defaultValue={(item[f.name] as number | null) ?? ""}
              placeholder="0"
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-zinc-500"
            />
          </div>
        ))}
      </div>

      <button
        type="submit"
        className="mt-2 w-full rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-zinc-900 hover:bg-zinc-200 sm:w-fit"
      >
        Simpan Performa
      </button>
      <p className="text-xs text-zinc-500">
        Menyimpan ini otomatis menandai konten sebagai &quot;Tayang&quot;.
      </p>
    </form>
  );
}
