import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { Card, EmptyState, ButtonLink, PageHeader } from "@/components/ui";
import BulkMetricsForm, { type PendingItem } from "@/components/BulkMetricsForm";

export const dynamic = "force-dynamic";

export const metadata = { title: "Isi Metrik · Creator Studio" };

export default async function BulkMetricsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const user = await requireUser();
  const { saved } = await searchParams;

  const pending = await prisma.contentItem.findMany({
    where: { userId: user.id, status: "PUBLISHED", views: null },
    include: { account: { select: { label: true } } },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
  });

  const items: PendingItem[] = pending.map((item) => ({
    id: item.id,
    title: item.title,
    platform: item.platform,
    contentType: item.contentType,
    publishedAt: item.publishedAt?.toISOString() ?? null,
    accountLabel: item.account?.label ?? null,
  }));

  return (
    <div>
      <PageHeader
        title="Isi Metrik"
        description="Semua konten yang sudah tayang tapi angkanya belum dicatat. Isi sekaligus di sini."
      />

      {saved && (
        <p className="mb-4 rounded-lg border border-[var(--success-border)] bg-[var(--success-bg)] px-3 py-2 text-sm text-[var(--success)]">
          {saved} konten tersimpan. Worth It score dan insight-nya sudah diperbarui.
        </p>
      )}

      {items.length === 0 ? (
        <EmptyState
          title="Semua angka sudah terisi"
          description="Tidak ada konten tayang yang metriknya kosong. Nanti kalau ada konten baru tayang, dia muncul di sini."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <ButtonLink href="/insights">Lihat Insight</ButtonLink>
              <ButtonLink href="/content" variant="secondary">
                Semua Konten
              </ButtonLink>
            </div>
          }
        />
      ) : (
        <>
          <Card className="mb-4 p-4">
            <p className="text-sm text-[var(--text-muted)]">
              Buka analytics di aplikasi sosmedmu, lalu salin angkanya ke sini. Yang wajib
              cuma <strong className="font-medium text-[var(--text)]">Views</strong> — sisanya
              boleh dikosongkan, tapi makin lengkap makin akurat penilaiannya.
            </p>
          </Card>
          <BulkMetricsForm items={items} />
        </>
      )}
    </div>
  );
}
