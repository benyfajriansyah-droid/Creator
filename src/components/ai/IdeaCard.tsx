"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { SocialAccount } from "@prisma/client";
import type { GeneratedIdea } from "@/lib/ai-schemas";
import { saveIdeaAsContent } from "@/app/actions";
import { Badge, Card, buttonStyles } from "@/components/ui";

export default function IdeaCard({
  idea,
  accounts,
}: {
  idea: GeneratedIdea;
  accounts: SocialAccount[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [savedId, setSavedId] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<string>(accounts[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);

  function save() {
    setError(null);
    startTransition(async () => {
      try {
        const { id } = await saveIdeaAsContent({
          title: idea.title,
          hook: idea.hook,
          angle: idea.angle,
          outline: idea.outline,
          tags: idea.tags,
          format: idea.format,
          accountId: accountId || null,
        });
        setSavedId(id);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Gagal menyimpan");
      }
    });
  }

  return (
    <Card className="p-4">
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        <Badge tone="accent">{idea.format}</Badge>
        {idea.goal && <Badge>{idea.goal}</Badge>}
      </div>

      <h3 className="text-base font-semibold text-[var(--text)]">{idea.title}</h3>

      <p className="mt-2 rounded-lg bg-[var(--surface-muted)] px-3 py-2 text-sm text-[var(--text)]">
        <span className="font-medium text-[var(--text-muted)]">Hook: </span>
        {idea.hook}
      </p>

      <p className="mt-2 text-sm text-[var(--text-muted)]">{idea.angle}</p>

      {idea.outline.length > 0 && (
        <ol className="mt-3 space-y-1 text-sm text-[var(--text-muted)]">
          {idea.outline.map((step, i) => (
            <li key={i} className="flex gap-2">
              <span className="shrink-0 text-[var(--text-subtle)]">{i + 1}.</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      )}

      {idea.cta && (
        <p className="mt-3 text-sm">
          <span className="font-medium text-[var(--text-muted)]">CTA: </span>
          <span className="text-[var(--text)]">{idea.cta}</span>
        </p>
      )}

      <p className="mt-3 border-t border-[var(--border)] pt-3 text-xs text-[var(--text-muted)]">
        <span className="font-medium">Kenapa ini masuk akal: </span>
        {idea.whyItWorks}
      </p>

      {idea.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {idea.tags.map((tag) => (
            <span
              key={tag}
              className="rounded bg-[var(--surface-muted)] px-1.5 py-0.5 text-[11px] text-[var(--text-muted)]"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[var(--border)] pt-3">
        {savedId ? (
          <>
            <span className="text-sm font-medium text-[var(--success)]">
              ✓ Tersimpan sebagai ide
            </span>
            <a href={`/content/${savedId}`} className={buttonStyles.ghost}>
              Buka konten →
            </a>
          </>
        ) : (
          <>
            {accounts.length > 0 && (
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                aria-label="Simpan ke akun"
                className="rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-2 py-1.5 text-xs text-[var(--text)]"
              >
                <option value="">Tanpa akun</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.label}
                  </option>
                ))}
              </select>
            )}
            <button
              type="button"
              onClick={save}
              disabled={pending}
              className={buttonStyles.secondary}
            >
              {pending ? "Menyimpan…" : "+ Simpan jadi konten"}
            </button>
          </>
        )}
        {error && <span className="text-xs text-[var(--danger)]">{error}</span>}
      </div>
    </Card>
  );
}
