"use client";

import { useState } from "react";
import type { SocialAccount } from "@prisma/client";
import {
  FUNNEL_STAGES,
  type FunnelResult,
  type IdeasResult,
} from "@/lib/ai-schemas";
import { Card, EmptyState, buttonStyles, inputStyles } from "@/components/ui";
import IdeaCard from "@/components/ai/IdeaCard";

type Mode = "ideas" | "funnel";

const PRESETS: Record<Mode, string[]> = {
  ideas: [
    "Ide untuk minggu depan",
    "Konten yang bisa dibuat cepat tanpa syuting",
    "Ide buat naikin engagement yang lagi turun",
    "Konten seri berkelanjutan",
  ],
  funnel: [
    "Funnel buat jualan produk digital",
    "Funnel buat dapat klien jasa",
    "Funnel buat naikin subscriber",
  ],
};

export default function Generator({
  mode,
  accounts,
}: {
  mode: Mode;
  accounts: SocialAccount[];
}) {
  const [brief, setBrief] = useState("");
  const [count, setCount] = useState(mode === "funnel" ? 2 : 5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ideas, setIdeas] = useState<IdeasResult | null>(null);
  const [funnel, setFunnel] = useState<FunnelResult | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    setIdeas(null);
    setFunnel(null);

    try {
      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, brief, count }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data?.error ?? "Gagal membuat saran");
        return;
      }

      if (mode === "funnel") setFunnel(data.result as FunnelResult);
      else setIdeas(data.result as IdeasResult);
    } catch {
      setError("Gagal menghubungi server. Cek koneksi lalu coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <Card className="mb-6 p-5">
        <label className="mb-1.5 block text-sm font-medium text-[var(--text)]">
          {mode === "funnel"
            ? "Apa yang mau kamu capai lewat funnel ini?"
            : "Mau ide seperti apa?"}
        </label>
        <textarea
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          rows={3}
          placeholder={
            mode === "funnel"
              ? "Misal: mau jualan preset editing seharga 150rb ke pemula yang baru mulai bikin reels"
              : "Kosongkan kalau mau AI usulkan sendiri berdasarkan data performamu"
          }
          className={inputStyles}
        />

        <div className="mt-3 flex flex-wrap gap-1.5">
          {PRESETS[mode].map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setBrief(preset)}
              className="rounded-full border border-[var(--border)] px-3 py-1 text-xs text-[var(--text-muted)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text)]"
            >
              {preset}
            </button>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
            {mode === "funnel" ? "Ide per tahap" : "Jumlah ide"}
            <select
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-2 py-1.5 text-sm text-[var(--text)]"
            >
              {(mode === "funnel" ? [1, 2, 3, 4] : [3, 5, 8]).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={generate}
            disabled={loading}
            className={buttonStyles.primary}
          >
            {loading
              ? "Menyusun…"
              : mode === "funnel"
                ? "Rancang Funnel"
                : "Buatkan Ide"}
          </button>
        </div>

        {loading && (
          <p className="mt-3 text-sm text-[var(--text-muted)]">
            AI sedang membaca data performa kontenmu. Ini bisa sampai satu menit.
          </p>
        )}

        {error && (
          <p className="mt-3 rounded-lg border border-[var(--danger-border)] bg-[var(--danger-bg)] px-3 py-2 text-sm text-[var(--danger)]">
            {error}
          </p>
        )}
      </Card>

      {ideas && (
        <div>
          <Card className="mb-4 border-[color-mix(in_srgb,var(--accent)_30%,transparent)] bg-[var(--accent-soft)] p-4">
            <p className="text-sm font-medium text-[var(--accent)]">
              Yang AI lihat dari datamu
            </p>
            <p className="mt-1 text-sm text-[var(--text)]">{ideas.reading}</p>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2 [&>*]:min-w-0">
            {ideas.ideas.map((idea, i) => (
              <IdeaCard key={i} idea={idea} accounts={accounts} />
            ))}
          </div>
        </div>
      )}

      {funnel && (
        <div>
          <Card className="mb-6 border-[color-mix(in_srgb,var(--accent)_30%,transparent)] bg-[var(--accent-soft)] p-4">
            <p className="text-sm font-medium text-[var(--accent)]">Alur funnel</p>
            <p className="mt-1 text-sm text-[var(--text)]">{funnel.strategy}</p>
          </Card>

          <div className="space-y-8">
            {FUNNEL_STAGES.map((stage) => (
              <section key={stage.key}>
                <div className="mb-3">
                  <h2 className="text-sm font-semibold text-[var(--text)]">
                    {stage.label}
                  </h2>
                  <p className="text-xs text-[var(--text-muted)]">{stage.description}</p>
                </div>
                <div className="grid gap-4 lg:grid-cols-2 [&>*]:min-w-0">
                  {funnel[stage.key].map((idea, i) => (
                    <IdeaCard key={i} idea={idea} accounts={accounts} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      )}

      {!ideas && !funnel && !loading && !error && (
        <EmptyState
          title={
            mode === "funnel"
              ? "Belum ada funnel yang dirancang"
              : "Belum ada ide yang dibuat"
          }
          description={
            mode === "funnel"
              ? "AI akan menyusun rangkaian konten dari tahap menarik penonton baru sampai mengubah mereka jadi pembeli."
              : "Setiap ide dilengkapi hook, outline, dan alasan kenapa cocok dengan data kontenmu — dan bisa langsung disimpan ke papan konten."
          }
        />
      )}
    </div>
  );
}
