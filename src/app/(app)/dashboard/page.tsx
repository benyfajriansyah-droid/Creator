import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { scoreContent } from "@/lib/scoring";
import {
  Card,
  ButtonLink,
  EmptyState,
  SectionHeading,
  StatTile,
} from "@/components/ui";
import { ContentRow } from "@/components/ContentCard";
import { formatNumber, formatRupiah, relativeTime } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser();

  const now = new Date();
  const weekAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // One round trip instead of five — the DB is a long way from the function.
  const [items, upcoming, ideas, accountCount] = await Promise.all([
    prisma.contentItem.findMany({
      where: { userId: user.id, status: "PUBLISHED" },
      include: { account: true },
      orderBy: { publishedAt: "desc" },
    }),
    prisma.contentItem.findMany({
      where: {
        userId: user.id,
        status: "SCHEDULED",
        scheduledAt: { gte: now, lte: weekAhead },
      },
      include: { account: true },
      orderBy: { scheduledAt: "asc" },
      take: 5,
    }),
    prisma.contentItem.findMany({
      where: { userId: user.id, status: { in: ["IDEA", "DRAFT"] } },
      include: { account: true },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
    prisma.socialAccount.count({ where: { userId: user.id } }),
  ]);

  const scores = scoreContent(items);

  const totalViews = items.reduce((sum, i) => sum + (i.views ?? 0), 0);
  const totalRevenue = items.reduce((sum, i) => sum + (i.revenue ?? 0), 0);
  const totalHours = items.reduce((sum, i) => sum + (i.hoursSpent ?? 0), 0);

  const ranked = items
    .map((item) => ({ item, score: scores.get(item.id)! }))
    .filter((r) => r.score.engagementRate !== null)
    .sort((a, b) => (b.score.engagementRate ?? 0) - (a.score.engagementRate ?? 0));

  const topPerformers = ranked.filter((r) => r.score.verdict === "WORTH_IT").slice(0, 4);
  const weakPerformers = ranked
    .filter((r) => r.score.verdict === "NOT_WORTH_IT")
    .slice(-4)
    .reverse();

  const isBrandNew = items.length === 0 && upcoming.length === 0 && ideas.length === 0;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Halo, {user.name.split(" ")[0]} 👋
          </h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Ringkasan performa dan rencana konten kamu.
          </p>
        </div>
        <ButtonLink href="/content/new">+ Konten Baru</ButtonLink>
      </div>

      {isBrandNew ? (
        <EmptyState
          title="Mulai dari sini"
          description="Catat ide pertamamu, jadwalkan kapan tayang, lalu isi metriknya setelah posting. Dari situ Creator Studio bisa bilang konten mana yang worth it."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <ButtonLink href="/content/new">+ Buat Konten Pertama</ButtonLink>
              <ButtonLink href="/accounts" variant="secondary">
                Atur Akun Sosmed
              </ButtonLink>
            </div>
          }
        />
      ) : (
        <>
          <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile
              label="Konten Tayang"
              value={formatNumber(items.length)}
              sub={`${accountCount} akun terhubung`}
            />
            <StatTile label="Total Views" value={formatNumber(totalViews)} />
            <StatTile
              label="Total Revenue"
              value={formatRupiah(totalRevenue)}
              sub={totalHours > 0 ? `${formatNumber(Math.round(totalHours))} jam kerja` : undefined}
            />
            <StatTile
              label="Rp / Jam"
              value={
                totalHours > 0 ? formatRupiah(Math.round(totalRevenue / totalHours)) : "—"
              }
              sub="Rata-rata bayaran per jam"
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2 [&>section]:min-w-0">
            <section>
              <SectionHeading
                title="🗓 Akan tayang minggu ini"
                action={
                  <Link
                    href="/calendar"
                    className="text-xs font-medium text-[var(--accent)] hover:underline"
                  >
                    Lihat kalender
                  </Link>
                }
              />
              <Card>
                {upcoming.length === 0 ? (
                  <EmptyState
                    compact
                    title="Belum ada jadwal"
                    description="Jadwalkan konten supaya kamu diingatkan sebelum waktunya posting."
                  />
                ) : (
                  upcoming.map((item) => <ContentRow key={item.id} item={item} />)
                )}
              </Card>
            </section>

            <section>
              <SectionHeading
                title="💡 Lagi digarap"
                action={
                  <Link
                    href="/board"
                    className="text-xs font-medium text-[var(--accent)] hover:underline"
                  >
                    Buka papan
                  </Link>
                }
              />
              <Card>
                {ideas.length === 0 ? (
                  <EmptyState
                    compact
                    title="Tidak ada ide tersimpan"
                    description="Simpan ide mentah di sini biar nggak lupa."
                  />
                ) : (
                  ideas.map((item) => <ContentRow key={item.id} item={item} />)
                )}
              </Card>
            </section>

            <section>
              <SectionHeading
                title="🔥 Paling worth it"
                description="Engagement di atas rata-rata kamu."
              />
              <Card>
                {topPerformers.length === 0 ? (
                  <EmptyState
                    compact
                    title="Belum cukup data"
                    description="Isi metrik minimal 2 konten yang sudah tayang."
                  />
                ) : (
                  topPerformers.map(({ item, score }) => (
                    <ContentRow key={item.id} item={item} score={score} />
                  ))
                )}
              </Card>
            </section>

            <section>
              <SectionHeading
                title="📉 Perlu dievaluasi"
                description="Engagement jauh di bawah rata-rata."
              />
              <Card>
                {weakPerformers.length === 0 ? (
                  <EmptyState compact title="Aman, tidak ada yang tertinggal jauh" />
                ) : (
                  weakPerformers.map(({ item, score }) => (
                    <ContentRow key={item.id} item={item} score={score} />
                  ))
                )}
              </Card>
            </section>
          </div>
        </>
      )}

      {upcoming.length > 0 && (
        <p className="mt-6 text-center text-xs text-[var(--text-subtle)]">
          Konten terdekat: {relativeTime(upcoming[0].scheduledAt)}
        </p>
      )}
    </div>
  );
}
