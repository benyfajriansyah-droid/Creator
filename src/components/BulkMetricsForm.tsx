"use client";

import { useFormStatus } from "react-dom";
import { logMetricsBulk } from "@/app/actions";
import { Card, buttonStyles, inputStyles } from "@/components/ui";
import { PLATFORM_LABEL, formatDate } from "@/lib/constants";
import type { Platform } from "@prisma/client";

export type PendingItem = {
  id: string;
  title: string;
  platform: Platform;
  contentType: string;
  publishedAt: string | null;
  accountLabel: string | null;
};

const FIELDS = [
  { key: "views", label: "Views" },
  { key: "likes", label: "Likes" },
  { key: "comments", label: "Komentar" },
  { key: "shares", label: "Shares" },
  { key: "saves", label: "Saves" },
] as const;

function SubmitButton({ count }: { count: number }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={buttonStyles.primary}>
      {pending ? "Menyimpan…" : `Simpan ${count} konten`}
    </button>
  );
}

export default function BulkMetricsForm({ items }: { items: PendingItem[] }) {
  return (
    <form action={logMetricsBulk}>
      <div className="space-y-3">
        {items.map((item) => (
          <Card key={item.id} className="p-4">
            <input type="hidden" name="id" value={item.id} />

            <div className="mb-3">
              <p className="font-medium break-words">{item.title}</p>
              <p className="mt-0.5 text-xs text-[var(--text-subtle)]">
                {PLATFORM_LABEL[item.platform]} · {item.contentType}
                {item.accountLabel ? ` · ${item.accountLabel}` : ""}
                {item.publishedAt ? ` · tayang ${formatDate(item.publishedAt)}` : ""}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {FIELDS.map((field) => (
                <label key={field.key} className="block">
                  <span className="mb-1 block text-xs text-[var(--text-muted)]">
                    {field.label}
                    {field.key === "views" && (
                      <span className="text-[var(--accent)]"> *</span>
                    )}
                  </span>
                  <input
                    type="number"
                    min={0}
                    inputMode="numeric"
                    name={`${field.key}_${item.id}`}
                    placeholder="0"
                    className={`${inputStyles} px-2 py-1.5 text-sm`}
                  />
                </label>
              ))}
            </div>
          </Card>
        ))}
      </div>

      <div className="sticky bottom-20 mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)]/95 p-3 backdrop-blur lg:bottom-4">
        <SubmitButton count={items.length} />
        <p className="text-xs text-[var(--text-muted)]">
          Baris yang kolom Views-nya dibiarkan kosong akan dilewati, bukan dikosongkan.
        </p>
      </div>
    </form>
  );
}
