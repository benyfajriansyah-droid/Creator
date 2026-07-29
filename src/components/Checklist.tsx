"use client";

import { useOptimistic, useRef, useTransition } from "react";
import type { ChecklistItem } from "@prisma/client";
import { addChecklistItem, deleteChecklistItem, toggleChecklistItem } from "@/app/actions";
import { inputStyles } from "@/components/ui";

export default function Checklist({
  contentId,
  items,
}: {
  contentId: string;
  items: ChecklistItem[];
}) {
  const [, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  // Ticking a box should feel instant even though it round-trips to the server.
  const [optimisticItems, applyToggle] = useOptimistic(
    items,
    (state: ChecklistItem[], toggledId: string) =>
      state.map((item) =>
        item.id === toggledId ? { ...item, done: !item.done } : item
      )
  );

  const doneCount = optimisticItems.filter((i) => i.done).length;
  const progress =
    optimisticItems.length > 0
      ? Math.round((doneCount / optimisticItems.length) * 100)
      : 0;

  return (
    <div>
      {optimisticItems.length > 0 && (
        <div className="mb-3">
          <div className="mb-1 flex items-center justify-between text-xs text-[var(--text-muted)]">
            <span>
              {doneCount} dari {optimisticItems.length} selesai
            </span>
            <span className="tabular-nums">{progress}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-[var(--surface-muted)]">
            <div
              className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      <ul className="space-y-0.5">
        {optimisticItems.map((item) => (
          <li key={item.id} className="group flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                startTransition(async () => {
                  applyToggle(item.id);
                  await toggleChecklistItem(item.id);
                })
              }
              className="flex flex-1 items-center gap-2.5 rounded-md px-1.5 py-1.5 text-left transition-colors hover:bg-[var(--surface-muted)]"
            >
              <span
                className={`flex size-4 shrink-0 items-center justify-center rounded border transition-colors ${
                  item.done
                    ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-text)]"
                    : "border-[var(--border-strong)]"
                }`}
                aria-hidden
              >
                {item.done && (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                )}
              </span>
              <span
                className={`text-sm ${
                  item.done
                    ? "text-[var(--text-subtle)] line-through"
                    : "text-[var(--text)]"
                }`}
              >
                {item.label}
              </span>
            </button>

            <button
              type="button"
              aria-label={`Hapus ${item.label}`}
              onClick={() => startTransition(() => void deleteChecklistItem(item.id))}
              className="rounded px-1.5 py-1 text-xs text-[var(--text-subtle)] opacity-0 transition-opacity group-hover:opacity-100 hover:text-[var(--danger)] focus-visible:opacity-100"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>

      <form
        ref={formRef}
        action={async (formData) => {
          await addChecklistItem(contentId, formData);
          formRef.current?.reset();
        }}
        className="mt-3 flex gap-2"
      >
        <input
          name="label"
          required
          placeholder="Tambah langkah…"
          className={`${inputStyles} flex-1`}
        />
        <button
          type="submit"
          className="rounded-lg border border-[var(--border-strong)] px-3 text-sm text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-muted)] hover:text-[var(--text)]"
        >
          Tambah
        </button>
      </form>
    </div>
  );
}
