import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { scoreContent, engagementRateOf, formatEngagement } from "@/lib/scoring";
import { PageHeader, Card, EmptyState, SectionHeading, StatTile, Badge } from "@/components/ui";
import { ContentRow } from "@/components/ContentCard";
import { PLATFORM_LABEL, formatNumber, formatRupiah } from "@/lib/constants";

export const dynamic = "force-dynamic";

type Grouped = {
  key: string;
  label: string;
  color?: string;
  count: number;
  avgEngagement: number | null;
  views: number;
};

function summarise(
  rows: { key: string; label: string; color?: string; rate: number | null; views: number }[]
): Grouped[] {
  const map = new Map<string, Grouped & { rateSum: number; rateCount: number }>();

  for (const row of rows) {
    const existing = map.get(row.key) ?? {
      key: row.key,
      label: row.label,
      color: row.color,
      count: 0,
      avgEngagement: null,
      views: 0,
      rateSum: 0,
      rateCount: 0,
    };
    existing.count += 1;
    existing.views += row.views;
    if (row.rate !== null) {
      existing.rateSum += row.rate;
      existing.rateCount += 1;
    }
    map.set(row.key, existing);
  }

  return [...map.values()]
    .map(({ rateSum, rateCount, ...rest }) => ({
      ...rest,
      avgEngagement: rateCount > 0 ? rateSum / rateCount : null,
    }))
    .sort((a, b) => (b.avgEngagement ?? -1) - (a.avgEngagement ?? -1));
}

export default async function InsightsPage() {
  const user = await requireUser();

  const items = await prisma.contentItem.findMany({
    where: { userId: user.id, status: "PUBLISHED" },
    include: { account: true },
  });

  if (items.length === 0) {
    return (
      <div>
        <PageHeader title="Insight" description="Pola dari konten yang sudah tayang." />
        <EmptyState
          title="Belum ada data untuk dianalisis"
          description="Isi metrik pada konten yang sudah tayang. Setelah ada beberapa data, di sini akan muncul perbandingan performa per akun, platform, dan tipe konten."
        />
      </div>
    );
  }

  const scores = scoreContent(items);

  const byAccount = summarise(
    items.map((i) => ({
      key: i.account?.id ?? "none",
      label: i.account?.label ?? "Tanpa akun",
      color: i.account?.color,
      rate: engagementRateOf(i),
      views: i.views ?? 0,
    }))
  );

  const byPlatform = summarise(
    items.map((i) => ({
      key: i.platform,
      label: PLATFORM_LABEL[i.platform],
      rate: engagementRateOf(i),
      views: i.views ?? 0,
    }))
  );

  const byType = summarise(
    items.map((i) => ({
      key: i.contentType,
      label: i.contentType,
      rate: engagementRateOf(i),
      views: i.views ?? 0,
    }))
  );

  const tagCounts = new Map<string, { count: number; rateSum: number; rateCount: number }>();
  for (const item of items) {
    const rate = engagementRateOf(item);
    for (const tag of item.tags) {
      const entry = tagCounts.get(tag) ?? { count: 0, rateSum: 0, rateCount: 0 };
      entry.count += 1;
      if (rate !== null) {
        entry.rateSum += rate;
        entry.rateCount += 1;
      }
      tagCounts.set(tag, entry);
    }
  }
  const topTags = [...tagCounts.entries()]
    .map(([tag, v]) => ({
      tag,
      count: v.count,
      avg: v.rateCount > 0 ? v.rateSum / v.rateCount : null,
    }))
    .sort((a, b) => (b.avg ?? -1) - (a.avg ?? -1))
    .slice(0, 8);

  const ranked = items
    .map((item) => ({ item, score: scores.get(item.id)! }))
    .filter((r) => r.score.engagementRate !== null)
    .sort((a, b) => (b.score.engagementRate ?? 0) - (a.score.engagementRate ?? 0));

  const totalViews = items.reduce((s, i) => s + (i.views ?? 0), 0);
  const totalRevenue = items.reduce((s, i) => s + (i.revenue ?? 0), 0);
  const measured = items.map(engagementRateOf).filter((r): r is number => r !== null);
  const avgEngagement =
    measured.length > 0 ? measured.reduce((a, b) => a + b, 0) / measured.length : null;

  return (
    <div>
      <PageHeader title="Insight" description="Pola dari konten yang sudah tayang." />

      <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Konten dianalisis" value={formatNumber(items.length)} />
        <StatTile label="Rata-rata engagement" value={formatEngagement(avgEngagement)} />
        <StatTile label="Total views" value={formatNumber(totalViews)} />
        <StatTile label="Total revenue" value={formatRupiah(totalRevenue)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2 [&>section]:min-w-0">
        <BreakdownCard
          title="Per akun"
          description="Akun mana yang paling nendang."
          rows={byAccount}
        />
        <BreakdownCard
          title="Per platform"
          description="Platform dengan engagement terbaik."
          rows={byPlatform}
        />
        <BreakdownCard
          title="Per tipe konten"
          description="Format apa yang paling cocok buat audiens kamu."
          rows={byType}
        />

        <section>
          <SectionHeading title="Tag teratas" description="Tema yang paling sering nyantol." />
          <Card className="p-4">
            {topTags.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">
                Belum ada tag. Tambahkan tag di konten supaya polanya kelihatan.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {topTags.map(({ tag, count, avg }) => (
                  <Badge key={tag} tone="accent">
                    #{tag} · {formatEngagement(avg)} ({count})
                  </Badge>
                ))}
              </div>
            )}
          </Card>
        </section>
      </div>

      <section className="mt-8">
        <SectionHeading title="Peringkat konten" description="Diurutkan dari engagement tertinggi." />
        <Card className="overflow-hidden">
          {ranked.length === 0 ? (
            <EmptyState compact title="Belum ada konten dengan metrik terisi" />
          ) : (
            ranked.map(({ item, score }) => (
              <ContentRow key={item.id} item={item} score={score} />
            ))
          )}
        </Card>
      </section>
    </div>
  );
}

function BreakdownCard({
  title,
  description,
  rows,
}: {
  title: string;
  description: string;
  rows: Grouped[];
}) {
  const max = Math.max(...rows.map((r) => r.avgEngagement ?? 0), 0.0001);

  return (
    <section>
      <SectionHeading title={title} description={description} />
      <Card className="p-4">
        {rows.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">Belum ada data.</p>
        ) : (
          <ul className="space-y-3">
            {rows.map((row) => (
              <li key={row.key}>
                <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
                  <span className="flex min-w-0 items-center gap-1.5">
                    {row.color && (
                      <span
                        className="size-2 shrink-0 rounded-full"
                        style={{ backgroundColor: row.color }}
                        aria-hidden
                      />
                    )}
                    <span className="truncate">{row.label}</span>
                  </span>
                  <span className="shrink-0 tabular-nums text-[var(--text-muted)]">
                    {formatEngagement(row.avgEngagement)}
                    <span className="ml-1 text-xs text-[var(--text-subtle)]">
                      ({row.count})
                    </span>
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-[var(--surface-muted)]">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.round(((row.avgEngagement ?? 0) / max) * 100)}%`,
                      backgroundColor: row.color ?? "var(--accent)",
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </section>
  );
}
