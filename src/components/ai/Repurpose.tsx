"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { RepurposeResult, RepurposedPiece } from "@/lib/ai-schemas";
import { saveRepurposedContent } from "@/app/actions";
import { PLATFORM_LABEL } from "@/lib/constants";
import { Badge, buttonStyles } from "@/components/ui";
import type { Platform } from "@prisma/client";

export default function Repurpose({
  contentId,
  configured,
  hasSourceText,
}: {
  contentId: string;
  configured: boolean;
  hasSourceText: boolean;
}) {
  const router = useRouter();
  const [count, setCount] = useState(3);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RepurposeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<Record<number, string>>({});
  const [savingIndex, setSavingIndex] = useState<number | null>(null);

  if (!configured) {
    return (
      <p className="text-sm text-[var(--text-muted)]">
        Aktifkan fitur AI dulu (lihat halaman Asisten AI) untuk memakai fitur ini.
      </p>
    );
  }

  if (!hasSourceText) {
    return (
      <p className="text-sm text-[var(--text-muted)]">
        Isi dulu kolom <strong className="font-medium text-[var(--text)]">Naskah / transkrip</strong>{" "}
        di form detail konten ini — tempel script, transkrip, atau caption aslinya. AI butuh
        teks aslinya untuk bisa menulis ulang jadi format lain.
      </p>
    );
  }

  async function run() {
    setLoading(true);
    setError(null);
    setResult(null);
    setSaved({});

    try {
      const response = await fetch("/api/ai/repurpose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentId, count }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data?.error ?? "Gagal membuat konten turunan");
        return;
      }
      setResult(data.result as RepurposeResult);
    } catch {
      setError("Gagal menghubungi server.");
    } finally {
      setLoading(false);
    }
  }

  async function save(piece: RepurposedPiece, index: number) {
    setSavingIndex(index);
    try {
      const { id } = await saveRepurposedContent({
        sourceId: contentId,
        title: piece.title,
        platform: piece.platform,
        format: piece.format,
        hook: piece.hook,
        body: piece.body,
        angle: piece.angle,
        tags: piece.tags,
      });
      setSaved((prev) => ({ ...prev, [index]: id }));
      router.refresh();
    } catch {
      setError("Gagal menyimpan ke papan konten.");
    } finally {
      setSavingIndex(null);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-xs text-[var(--text-muted)]">
          Jumlah turunan
          <select
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            disabled={loading}
            className="ml-2 rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-2 py-1 text-xs text-[var(--text)]"
          >
            {[2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={run}
          disabled={loading}
          className={`${buttonStyles.primary} px-3 py-1.5 text-xs`}
        >
          {loading ? "Menyusun…" : "Pecah jadi konten lain"}
        </button>
      </div>

      {error && (
        <p className="mt-3 rounded-lg border border-[var(--danger-border)] bg-[var(--danger-bg)] px-3 py-2 text-sm text-[var(--danger)]">
          {error}
        </p>
      )}

      {result && (
        <div className="mt-4">
          <p className="text-sm text-[var(--text-muted)]">{result.reading}</p>

          <div className="mt-3 space-y-3">
            {result.pieces.map((piece, index) => (
              <div
                key={`${piece.title}-${index}`}
                className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium break-words">{piece.title}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <Badge tone="accent">
                        {PLATFORM_LABEL[piece.platform as Platform] ?? piece.platform}
                      </Badge>
                      <Badge>{piece.format}</Badge>
                    </div>
                  </div>
                  {saved[index] ? (
                    <a
                      href={`/content/${saved[index]}`}
                      className="shrink-0 text-xs font-medium text-[var(--success)] hover:underline"
                    >
                      ✓ Tersimpan — buka
                    </a>
                  ) : (
                    <button
                      type="button"
                      onClick={() => save(piece, index)}
                      disabled={savingIndex !== null}
                      className={`${buttonStyles.secondary} shrink-0 px-2.5 py-1 text-xs`}
                    >
                      {savingIndex === index ? "Menyimpan…" : "Simpan ke papan"}
                    </button>
                  )}
                </div>

                <p className="mt-2.5 text-xs text-[var(--text-subtle)]">{piece.angle}</p>

                <p className="mt-2 text-sm font-medium text-[var(--text)]">{piece.hook}</p>
                <p className="mt-1.5 text-sm whitespace-pre-wrap text-[var(--text-muted)]">
                  {piece.body}
                </p>

                {piece.tags.length > 0 && (
                  <p className="mt-2 text-xs text-[var(--text-subtle)]">
                    {piece.tags.map((t) => `#${t}`).join(" ")}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
