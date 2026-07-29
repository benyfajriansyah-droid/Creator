import Link from "next/link";
import type { ContentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { scoreContent } from "@/lib/scoring";
import { PageHeader, ButtonLink, Card, EmptyState } from "@/components/ui";
import { ContentRow } from "@/components/ContentCard";
import AccountFilter from "@/components/AccountFilter";
import { STATUSES, STATUS_LABEL } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function ContentListPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; account?: string; q?: string }>;
}) {
  const user = await requireUser();
  const { status, account, q } = await searchParams;

  const statusFilter = STATUSES.includes(status as ContentStatus)
    ? (status as ContentStatus)
    : undefined;

  const [items, accounts] = await Promise.all([
    prisma.contentItem.findMany({
      where: {
        userId: user.id,
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(account ? { accountId: account } : {}),
        ...(q ? { title: { contains: q, mode: "insensitive" as const } } : {}),
      },
      include: { account: true },
      orderBy: [{ updatedAt: "desc" }],
    }),
    prisma.socialAccount.findMany({
      where: { userId: user.id, archived: false },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const scores = scoreContent(items);

  const filterHref = (nextStatus?: string) => {
    const params = new URLSearchParams();
    if (nextStatus) params.set("status", nextStatus);
    if (account) params.set("account", account);
    if (q) params.set("q", q);
    const query = params.toString();
    return query ? `/content?${query}` : "/content";
  };

  return (
    <div>
      <PageHeader
        title="Semua Konten"
        description="Ide, jadwal, dan konten yang sudah tayang."
        action={<ButtonLink href="/content/new">+ Konten Baru</ButtonLink>}
      />

      <form action="/content" className="mb-4">
        {statusFilter && <input type="hidden" name="status" value={statusFilter} />}
        {account && <input type="hidden" name="account" value={account} />}
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Cari judul konten…"
          className="w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)] sm:max-w-xs"
        />
      </form>

      <AccountFilter
        accounts={accounts}
        basePath="/content"
        selected={account}
        extraParams={{ status: statusFilter, q }}
      />

      <div className="mb-4 flex flex-wrap gap-1.5">
        <Link
          href={filterHref()}
          className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
            !statusFilter
              ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
              : "border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-strong)]"
          }`}
        >
          Semua
        </Link>
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={filterHref(s)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              statusFilter === s
                ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                : "border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-strong)]"
            }`}
          >
            {STATUS_LABEL[s]}
          </Link>
        ))}
      </div>

      {items.length === 0 ? (
        <EmptyState
          title={q ? `Tidak ada konten cocok dengan "${q}"` : "Belum ada konten di sini"}
          description={
            q ? "Coba kata kunci lain." : "Setiap ide yang kamu simpan akan muncul di sini."
          }
          action={!q ? <ButtonLink href="/content/new">+ Buat Konten</ButtonLink> : undefined}
        />
      ) : (
        <Card className="overflow-hidden">
          {items.map((item) => (
            <ContentRow key={item.id} item={item} score={scores.get(item.id)} />
          ))}
        </Card>
      )}
    </div>
  );
}
