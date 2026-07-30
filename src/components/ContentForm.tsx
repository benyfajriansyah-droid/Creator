"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import type { ContentItem, SocialAccount } from "@prisma/client";
import { Field, buttonStyles, inputStyles } from "@/components/ui";
import {
  CONTENT_TYPES,
  PLATFORMS,
  PLATFORM_LABEL,
  STATUSES,
  STATUS_LABEL,
  toDatetimeLocalValue,
} from "@/lib/constants";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={buttonStyles.primary}>
      {pending ? "Menyimpan…" : label}
    </button>
  );
}

export default function ContentForm({
  item,
  accounts,
  action,
  timeZone,
}: {
  item?: ContentItem;
  accounts: SocialAccount[];
  action: (formData: FormData) => void;
  timeZone: string;
}) {
  const [status, setStatus] = useState(item?.status ?? "IDEA");
  const needsSchedule = status === "SCHEDULED" || status === "READY";
  const isPublished = status === "PUBLISHED";

  return (
    <form action={action} className="space-y-5">
      <Field label="Judul konten *">
        <input
          name="title"
          required
          defaultValue={item?.title}
          placeholder="Misal: 5 Tips Editing Cepat untuk Reels"
          className={inputStyles}
        />
      </Field>

      <Field label="Hook / opening" hint="Kalimat pertama yang bikin orang berhenti scroll.">
        <input
          name="hook"
          defaultValue={item?.hook ?? ""}
          placeholder="Misal: Berhenti edit pakai cara lama…"
          className={inputStyles}
        />
      </Field>

      <Field label="Deskripsi / brief">
        <textarea
          name="description"
          rows={3}
          defaultValue={item?.description ?? ""}
          placeholder="Poin-poin yang mau dibahas, referensi, atau outline kasar."
          className={inputStyles}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Akun">
          <select
            name="accountId"
            defaultValue={item?.accountId ?? ""}
            className={inputStyles}
          >
            <option value="">— Tanpa akun —</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.label}
                {account.handle ? ` (${account.handle})` : ""}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Platform">
          <select
            name="platform"
            defaultValue={item?.platform ?? "INSTAGRAM"}
            className={inputStyles}
          >
            {PLATFORMS.map((p) => (
              <option key={p} value={p}>
                {PLATFORM_LABEL[p]}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Tipe konten">
          <select
            name="contentType"
            defaultValue={item?.contentType ?? CONTENT_TYPES[1]}
            className={inputStyles}
          >
            {CONTENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Status">
          <select
            name="status"
            value={status}
            onChange={(e) => setStatus(e.target.value as typeof status)}
            className={inputStyles}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {needsSchedule && (
        <Field
          label="Jadwal tayang"
          hint="Kamu akan dapat notifikasi di HP sebelum waktunya."
        >
          <input
            type="datetime-local"
            name="scheduledAt"
            defaultValue={toDatetimeLocalValue(item?.scheduledAt ?? null, timeZone)}
            className={inputStyles}
          />
        </Field>
      )}

      {isPublished && (
        <Field label="Link postingan" hint="Tempel URL setelah konten tayang.">
          <input
            type="url"
            name="postUrl"
            defaultValue={item?.postUrl ?? ""}
            placeholder="https://instagram.com/p/…"
            className={inputStyles}
          />
        </Field>
      )}

      <Field label="Tag" hint="Pisahkan dengan koma. Misal: tutorial, editing, pemula">
        <input
          name="tags"
          defaultValue={item?.tags.join(", ") ?? ""}
          placeholder="tutorial, editing"
          className={inputStyles}
        />
      </Field>

      <Field
        label="Naskah / transkrip"
        hint="Tempel script, transkrip, atau caption final di sini. Ini yang dibaca AI kalau kamu mau memecah konten ini jadi format lain."
      >
        <textarea
          name="sourceText"
          rows={5}
          defaultValue={item?.sourceText ?? ""}
          placeholder="Hai, hari ini gue mau bahas…"
          className={inputStyles}
        />
      </Field>

      <Field label="Catatan">
        <textarea
          name="notes"
          rows={2}
          defaultValue={item?.notes ?? ""}
          placeholder="Link aset, referensi, atau reminder buat diri sendiri."
          className={inputStyles}
        />
      </Field>

      <SubmitButton label={item ? "Simpan Perubahan" : "Buat Konten"} />
    </form>
  );
}
