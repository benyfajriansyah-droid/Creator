"use client";

import { useState } from "react";
import { buttonStyles } from "@/components/ui";

const TASKS = [
  { key: "hooks", label: "Variasi hook" },
  { key: "script", label: "Draft script" },
  { key: "caption", label: "Caption & hashtag" },
  { key: "improve", label: "Evaluasi & saran" },
] as const;

export default function ContentAssist({
  contentId,
  configured,
  isPublished,
}: {
  contentId: string;
  configured: boolean;
  isPublished: boolean;
}) {
  const [loading, setLoading] = useState<string | null>(null);
  const [output, setOutput] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!configured) {
    return (
      <p className="text-sm text-[var(--text-muted)]">
        Aktifkan fitur AI dulu (lihat halaman Asisten AI) untuk memakai bantuan ini.
      </p>
    );
  }

  async function run(task: string) {
    setLoading(task);
    setError(null);
    setOutput(null);
    setCopied(false);

    try {
      const response = await fetch("/api/ai/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentId, task }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data?.error ?? "Gagal membuat saran");
        return;
      }
      setOutput(data.text);
    } catch {
      setError("Gagal menghubungi server.");
    } finally {
      setLoading(null);
    }
  }

  const tasks = TASKS.filter((t) => t.key !== "improve" || isPublished);

  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {tasks.map((task) => (
          <button
            key={task.key}
            type="button"
            onClick={() => run(task.key)}
            disabled={loading !== null}
            className="rounded-full border border-[var(--border-strong)] px-3 py-1.5 text-xs font-medium text-[var(--text)] transition-colors hover:bg-[var(--surface-muted)] disabled:opacity-60"
          >
            {loading === task.key ? "Menyusun…" : task.label}
          </button>
        ))}
      </div>

      {error && (
        <p className="mt-3 rounded-lg border border-[var(--danger-border)] bg-[var(--danger-bg)] px-3 py-2 text-sm text-[var(--danger)]">
          {error}
        </p>
      )}

      {output && (
        <div className="mt-3">
          <div className="max-h-96 overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-3">
            <p className="text-sm whitespace-pre-wrap text-[var(--text)]">{output}</p>
          </div>
          <button
            type="button"
            onClick={async () => {
              await navigator.clipboard.writeText(output);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            className={`${buttonStyles.ghost} mt-2`}
          >
            {copied ? "✓ Tersalin" : "Salin"}
          </button>
        </div>
      )}
    </div>
  );
}
