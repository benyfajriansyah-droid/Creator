import Link from "next/link";
import type { ContentItem, SocialAccount } from "@prisma/client";
import { Badge } from "@/components/ui";
import { PLATFORM_LABEL, STATUS_LABEL, STATUS_TONE, relativeTime } from "@/lib/constants";
import { VERDICT_LABEL, VERDICT_TONE, formatEngagement, type ScoredContent } from "@/lib/scoring";

export type ContentWithAccount = ContentItem & { account: SocialAccount | null };

export function AccountDot({ account }: { account: SocialAccount | null }) {
  if (!account) return null;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
      <span
        className="size-2 shrink-0 rounded-full"
        style={{ backgroundColor: account.color }}
        aria-hidden
      />
      <span className="truncate">{account.label}</span>
    </span>
  );
}

/** Row used in the content list and dashboard lists. */
export function ContentRow({
  item,
  score,
}: {
  item: ContentWithAccount;
  score?: ScoredContent;
}) {
  const when = item.publishedAt ?? item.scheduledAt;

  return (
    <Link
      href={`/content/${item.id}`}
      className="flex items-center gap-3 border-b border-[var(--border)] px-4 py-3 transition-colors last:border-0 hover:bg-[var(--surface-muted)]"
    >
      <span
        className="h-9 w-1 shrink-0 rounded-full"
        style={{ backgroundColor: item.account?.color ?? "var(--border-strong)" }}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-[var(--text)]">{item.title}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[var(--text-muted)]">
          <span>{PLATFORM_LABEL[item.platform]}</span>
          <span aria-hidden>·</span>
          <span>{item.contentType}</span>
          {when && (
            <>
              <span aria-hidden>·</span>
              <span>{relativeTime(when)}</span>
            </>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        {score && score.verdict !== "NO_DATA" && (
          <Badge tone={VERDICT_TONE[score.verdict]}>
            {formatEngagement(score.engagementRate)}
          </Badge>
        )}
        <Badge tone={STATUS_TONE[item.status]}>{STATUS_LABEL[item.status]}</Badge>
      </div>
    </Link>
  );
}

/** Compact card used on the kanban board. */
export function BoardCard({
  item,
  doneCount,
  totalCount,
}: {
  item: ContentWithAccount;
  doneCount: number;
  totalCount: number;
}) {
  return (
    <Link
      href={`/content/${item.id}`}
      className="block rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 shadow-[var(--shadow)] transition-colors hover:border-[var(--border-strong)]"
    >
      <p className="line-clamp-2 text-sm font-medium text-[var(--text)]">{item.title}</p>

      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
        <AccountDot account={item.account} />
        {!item.account && (
          <span className="text-xs text-[var(--text-subtle)]">
            {PLATFORM_LABEL[item.platform]}
          </span>
        )}
      </div>

      {item.scheduledAt && (
        <p className="mt-2 text-xs text-[var(--text-muted)]">
          🗓 {relativeTime(item.scheduledAt)}
        </p>
      )}

      {totalCount > 0 && (
        <div className="mt-2.5">
          <div className="h-1 overflow-hidden rounded-full bg-[var(--surface-muted)]">
            <div
              className="h-full rounded-full bg-[var(--accent)] transition-[width]"
              style={{ width: `${Math.round((doneCount / totalCount) * 100)}%` }}
            />
          </div>
          <p className="mt-1 text-[11px] text-[var(--text-subtle)]">
            {doneCount}/{totalCount} langkah
          </p>
        </div>
      )}

      {item.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {item.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="rounded bg-[var(--surface-muted)] px-1.5 py-0.5 text-[10px] text-[var(--text-muted)]"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}

export function VerdictBadge({ score }: { score: ScoredContent }) {
  return (
    <Badge tone={VERDICT_TONE[score.verdict]}>
      {VERDICT_LABEL[score.verdict]}
      {score.engagementRate !== null && ` · ${formatEngagement(score.engagementRate)}`}
    </Badge>
  );
}
