"use client";

import { useState } from "react";
import type { ContentItem } from "@/generated/prisma/client";
import { PLATFORMS, PLATFORM_LABEL, STATUSES, STATUS_LABEL, toDatetimeLocalValue } from "@/lib/constants";

const CONTENT_TYPES = ["Video", "Short/Reel", "Post", "Carousel", "Livestream", "Artikel", "Lainnya"];

export default function ContentForm({
  item,
  action,
}: {
  item?: ContentItem;
  action: (formData: FormData) => void;
}) {
  const [status, setStatus] = useState(item?.status ?? "IDEA");

  return (
    <form action={action} className="flex flex-col gap-5">
      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-300">Judul Konten *</label>
        <input
          name="title"
          required
          defaultValue={item?.title}
          placeholder="Misal: 5 Tips Editing Cepat untuk Reels"
          className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-zinc-500"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-300">Deskripsi / Brief</label>
        <textarea
          name="description"
          defaultValue={item?.description ?? ""}
          rows={3}
          placeholder="Ide, hook, atau catatan konten"
          className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-zinc-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-300">Platform</label>
          <select
            name="platform"
            defaultValue={item?.platform ?? "INSTAGRAM"}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-zinc-500"
          >
            {PLATFORMS.map((p) => (
              <option key={p} value={p}>
                {PLATFORM_LABEL[p]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-300">Tipe Konten</label>
          <select
            name="contentType"
            defaultValue={item?.contentType ?? "Video"}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-zinc-500"
          >
            {CONTENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-300">Status</label>
          <select
            name="status"
            value={status}
            onChange={(e) => setStatus(e.target.value as typeof status)}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-zinc-500"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
        {status !== "IDEA" && (
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-300">
              Jadwal Tayang
            </label>
            <input
              type="datetime-local"
              name="scheduledAt"
              defaultValue={toDatetimeLocalValue(item?.scheduledAt ?? null)}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-zinc-500"
            />
          </div>
        )}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-300">Catatan</label>
        <textarea
          name="notes"
          defaultValue={item?.notes ?? ""}
          rows={2}
          placeholder="Catatan tambahan, link aset, dll"
          className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-zinc-500"
        />
      </div>

      <button
        type="submit"
        className="mt-2 w-full rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-zinc-900 hover:bg-zinc-200 sm:w-fit"
      >
        {item ? "Simpan Perubahan" : "Buat Konten"}
      </button>
    </form>
  );
}
