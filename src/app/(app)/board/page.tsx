import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { PageHeader, ButtonLink, EmptyState } from "@/components/ui";
import { BoardCard } from "@/components/ContentCard";
import { STATUSES, STATUS_LABEL } from "@/lib/constants";
import AccountFilter from "@/components/AccountFilter";

export const dynamic = "force-dynamic";

const COLUMN_HINT: Record<string, string> = {
  IDEA: "Ide mentah",
  DRAFT: "Lagi dikerjakan",
  READY: "Siap posting",
  SCHEDULED: "Sudah dijadwalkan",
  PUBLISHED: "Sudah tayang",
};

export default async function BoardPage({
  searchParams,
}: {
  searchParams: Promise<{ account?: string }>;
}) {
  const user = await requireUser();
  const { account } = await searchParams;

  const [items, accounts] = await Promise.all([
    prisma.contentItem.findMany({
      where: {
        userId: user.id,
        ...(account ? { accountId: account } : {}),
      },
      include: {
        account: true,
        checklist: { select: { done: true } },
      },
      orderBy: [{ scheduledAt: "asc" }, { updatedAt: "desc" }],
    }),
    prisma.socialAccount.findMany({
      where: { userId: user.id, archived: false },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="Papan Konten"
        description="Alur kerja dari ide sampai tayang."
        action={<ButtonLink href="/content/new">+ Konten Baru</ButtonLink>}
      />

      <AccountFilter accounts={accounts} basePath="/board" selected={account} />

      {items.length === 0 ? (
        <EmptyState
          title="Papan masih kosong"
          description="Setiap konten yang kamu buat akan muncul di kolom sesuai statusnya."
          action={<ButtonLink href="/content/new">+ Buat Konten</ButtonLink>}
        />
      ) : (
        <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
          <div className="flex min-w-max gap-3">
            {STATUSES.map((status) => {
              const columnItems = items.filter((i) => i.status === status);
              return (
                <div key={status} className="flex w-64 shrink-0 flex-col">
                  <div className="mb-2 flex items-baseline justify-between px-1">
                    <h2 className="text-sm font-semibold">{STATUS_LABEL[status]}</h2>
                    <span className="text-xs text-[var(--text-subtle)]">
                      {columnItems.length}
                    </span>
                  </div>
                  <p className="mb-2 px-1 text-[11px] text-[var(--text-subtle)]">
                    {COLUMN_HINT[status]}
                  </p>

                  <div className="flex-1 space-y-2 rounded-xl bg-[var(--surface-muted)] p-2">
                    {columnItems.length === 0 ? (
                      <p className="px-2 py-6 text-center text-xs text-[var(--text-subtle)]">
                        Kosong
                      </p>
                    ) : (
                      columnItems.map((item) => (
                        <BoardCard
                          key={item.id}
                          item={item}
                          doneCount={item.checklist.filter((c) => c.done).length}
                          totalCount={item.checklist.length}
                        />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
