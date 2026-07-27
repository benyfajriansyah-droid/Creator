import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { scoreContent, verdictLabel, verdictColor } from "@/lib/scoring";
import { PLATFORM_LABEL, formatDate } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function Home() {
  const items = await prisma.contentItem.findMany({ orderBy: { createdAt: "desc" } });
  const scores = scoreContent(items);

  const published = items.filter((i) => i.status === "PUBLISHED");
  const scheduled = items
    .filter((i) => i.status === "SCHEDULED" && i.scheduledAt)
    .sort((a, b) => new Date(a.scheduledAt!).getTime() - new Date(b.scheduledAt!).getTime())
    .slice(0, 5);
  const ideas = items.filter((i) => i.status === "IDEA").slice(0, 5);

  const totalViews = published.reduce((sum, i) => sum + (i.views ?? 0), 0);
  const totalRevenue = published.reduce((sum, i) => sum + (i.revenue ?? 0), 0);

  const ranked = published
    .map((i) => ({ item: i, score: scores.get(i.id)! }))
    .filter((r) => r.score.engagementRate !== null)
    .sort((a, b) => (b.score.engagementRate ?? 0) - (a.score.engagementRate ?? 0));

  const topPerformers = ranked.filter((r) => r.score.verdict === "WORTH_IT").slice(0, 3);
  const worstPerformers = ranked
    .filter((r) => r.score.verdict === "NOT_WORTH_IT")
    .slice(-3)
    .reverse();

  const stats = [
    { label: "Total Konten", value: items.length },
    { label: "Sudah Tayang", value: published.length },
    { label: "Total Views", value: totalViews.toLocaleString("id-ID") },
    { label: "Total Revenue", value: `Rp${totalRevenue.toLocaleString("id-ID")}` },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-zinc-500">Ringkasan performa dan jadwal kontenmu.</p>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <p className="text-xs text-zinc-500">{s.label}</p>
            <p className="mt-1 text-xl font-semibold">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 text-sm font-semibold text-zinc-300">🔥 Konten Paling Worth It</h2>
          {topPerformers.length === 0 ? (
            <EmptyNote text="Belum cukup data performa. Isi metrik konten yang sudah tayang." />
          ) : (
            <ContentMiniList entries={topPerformers} />
          )}
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold text-zinc-300">📉 Perlu Dievaluasi</h2>
          {worstPerformers.length === 0 ? (
            <EmptyNote text="Belum ada konten dengan performa rendah." />
          ) : (
            <ContentMiniList entries={worstPerformers} />
          )}
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold text-zinc-300">🗓️ Akan Tayang</h2>
          {scheduled.length === 0 ? (
            <EmptyNote text="Belum ada konten yang dijadwalkan." />
          ) : (
            <div className="flex flex-col gap-2">
              {scheduled.map((item) => (
                <Link
                  key={item.id}
                  href={`/content/${item.id}`}
                  className="flex items-center justify-between rounded-lg border border-zinc-800 px-3 py-2 text-sm hover:bg-zinc-900/40"
                >
                  <span>{item.title}</span>
                  <span className="text-xs text-zinc-500">{formatDate(item.scheduledAt)}</span>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold text-zinc-300">💡 Ide Tersimpan</h2>
          {ideas.length === 0 ? (
            <EmptyNote text="Belum ada ide tersimpan." />
          ) : (
            <div className="flex flex-col gap-2">
              {ideas.map((item) => (
                <Link
                  key={item.id}
                  href={`/content/${item.id}`}
                  className="flex items-center justify-between rounded-lg border border-zinc-800 px-3 py-2 text-sm hover:bg-zinc-900/40"
                >
                  <span>{item.title}</span>
                  <span className="text-xs text-zinc-500">{PLATFORM_LABEL[item.platform]}</span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>

      {items.length === 0 && (
        <div className="mt-10 rounded-xl border border-dashed border-zinc-800 py-16 text-center">
          <p className="mb-4 text-sm text-zinc-500">
            Belum ada konten. Mulai dengan menambahkan ide, jadwal, atau konten yang sudah tayang.
          </p>
          <Link
            href="/content/new"
            className="inline-block rounded-lg bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-200"
          >
            + Buat Konten Pertama
          </Link>
        </div>
      )}
    </div>
  );
}

function EmptyNote({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-zinc-800 px-3 py-4 text-xs text-zinc-500">
      {text}
    </div>
  );
}

function ContentMiniList({
  entries,
}: {
  entries: { item: { id: string; title: string; status: string }; score: { engagementRate: number | null; verdict: keyof typeof verdictLabel } }[];
}) {
  return (
    <div className="flex flex-col gap-2">
      {entries.map(({ item, score }) => (
        <Link
          key={item.id}
          href={`/content/${item.id}`}
          className="flex items-center justify-between rounded-lg border border-zinc-800 px-3 py-2 text-sm hover:bg-zinc-900/40"
        >
          <span className="truncate">{item.title}</span>
          <span className={`ml-2 shrink-0 rounded-full border px-2 py-0.5 text-xs ${verdictColor[score.verdict]}`}>
            {score.engagementRate !== null ? `${(score.engagementRate * 100).toFixed(1)}%` : verdictLabel[score.verdict]}
          </span>
        </Link>
      ))}
    </div>
  );
}
