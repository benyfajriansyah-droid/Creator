"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ContentReview } from "@/lib/ai-schemas";
import { buttonStyles } from "@/components/ui";

type Props = {
  contentId: string;
  configured: boolean;
  /** Only published items with metrics can be evaluated. */
  ready: boolean;
  storedReview: string | null;
  reviewedAt: string | null;
};

function parse(raw: string): ContentReview | null {
  try {
    const value = JSON.parse(raw) as ContentReview;
    return Array.isArray(value.worked) && Array.isArray(value.improve) ? value : null;
  } catch {
    return null;
  }
}

export default function AutoReview({
  contentId,
  configured,
  ready,
  storedReview,
  reviewedAt,
}: Props) {
  const [raw, setRaw] = useState<string | null>(storedReview);
  const [at, setAt] = useState<string | null>(reviewedAt);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsUpgrade, setNeedsUpgrade] = useState(false);
  // Guards the automatic first run against a double mount in dev.
  const started = useRef(false);

  const run = useCallback(
    async (force: boolean) => {
      setLoading(true);
      setError(null);
      setNeedsUpgrade(false);
      try {
        const response = await fetch("/api/ai/review", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contentId, force }),
        });
        const data = await response.json();
        if (!response.ok) {
          if (response.status === 402) setNeedsUpgrade(true);
          else setError(data?.error ?? "Gagal membuat analisa");
          return;
        }
        setRaw(data.review);
        setAt(data.reviewedAt ?? null);
      } catch {
        setError("Gagal menghubungi server.");
      } finally {
        setLoading(false);
      }
    },
    [contentId]
  );

  // The "automatic" part: as soon as the numbers are in and nothing has been
  // written yet, the analysis starts without the user asking for it.
  useEffect(() => {
    if (!configured || !ready || raw || started.current) return;
    started.current = true;
    void run(false);
  }, [configured, ready, raw, run]);

  if (!configured) {
    return (
      <p className="text-sm text-[var(--text-muted)]">
        Aktifkan fitur AI dulu (lihat halaman Asisten AI) untuk memakai ini.
      </p>
    );
  }

  if (!ready) {
    return (
      <p className="text-sm text-[var(--text-muted)]">
        Analisa muncul otomatis begitu konten ini tayang dan angka performanya diisi.
      </p>
    );
  }

  if (needsUpgrade) {
    return (
      <p className="text-sm text-[var(--text-muted)]">
        Analisa otomatis termasuk fitur AI — kuotanya habis atau akunmu masih di plan
        Gratis. Lihat halaman{" "}
        <a href="/billing" className="font-medium text-[var(--accent)] hover:underline">
          Billing
        </a>
        .
      </p>
    );
  }

  if (loading && !raw) {
    return (
      <p className="text-sm text-[var(--text-muted)]">Menganalisa performa konten ini…</p>
    );
  }

  if (error && !raw) {
    return (
      <div>
        <p className="rounded-lg border border-[var(--danger-border)] bg-[var(--danger-bg)] px-3 py-2 text-sm text-[var(--danger)]">
          {error}
        </p>
        <button
          type="button"
          onClick={() => run(false)}
          className={`${buttonStyles.ghost} mt-2`}
        >
          Coba lagi
        </button>
      </div>
    );
  }

  if (!raw) return null;

  const review = parse(raw);

  return (
    <div>
      {review ? (
        <div className="space-y-4">
          <p className="text-sm font-medium text-[var(--text)]">{review.verdict}</p>

          <div>
            <p className="text-xs font-medium text-[var(--success)]">Yang jalan</p>
            <ul className="mt-1.5 space-y-1.5">
              {review.worked.map((point) => (
                <li key={point} className="text-sm text-[var(--text-muted)]">
                  • {point}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-xs font-medium text-[var(--warning)]">Yang bisa diperbaiki</p>
            <ul className="mt-1.5 space-y-1.5">
              {review.improve.map((point) => (
                <li key={point} className="text-sm text-[var(--text-muted)]">
                  • {point}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-3">
            <p className="text-xs font-medium text-[var(--text-muted)]">Langkah berikutnya</p>
            <p className="mt-1 text-sm text-[var(--text)]">{review.nextAction}</p>
          </div>
        </div>
      ) : (
        // The model didn't return the expected shape — show what it did say
        // rather than nothing at all.
        <p className="text-sm whitespace-pre-wrap text-[var(--text-muted)]">{raw}</p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-[var(--border)] pt-3">
        <button
          type="button"
          onClick={() => run(true)}
          disabled={loading}
          className={buttonStyles.ghost}
        >
          {loading ? "Menganalisa…" : "Analisa ulang"}
        </button>
        {at && (
          <span className="text-xs text-[var(--text-subtle)]">
            Dianalisa {new Date(at).toLocaleDateString("id-ID", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </span>
        )}
      </div>
      {error && <p className="mt-2 text-xs text-[var(--danger)]">{error}</p>}
    </div>
  );
}
