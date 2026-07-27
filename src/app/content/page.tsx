import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { scoreContent, verdictLabel, verdictColor } from "@/lib/scoring";
import {
  PLATFORM_LABEL,
  STATUS_LABEL,
  STATUS_COLOR,
  formatDate,
} from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function ContentListPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;

  const items = await prisma.contentItem.findMany({
    orderBy: [{ scheduledAt: "desc" }, { createdAt: "desc" }],
  });
  const scores = scoreContent(items);

  const filtered = status ? items.filter((i) => i.status === status) : items;

  const filters = [
    { key: "", label: "Semua" },
    { key: "IDEA", label: "Ide" },
    { key: "SCHEDULED", label: "Terjadwal" },
    { key: "PUBLISHED", label: "Tayang" },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Konten</h1>
          <p className="text-sm text-zinc-500">Semua ide, jadwal, dan konten yang sudah tayang.</p>
        </div>
        <Link
          href="/content/new"
          className="hidden rounded-lg bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-200 sm:block"
        >
          + Konten Baru
        </Link>
      </div>

      <div className="mb-4 flex gap-2">
        {filters.map((f) => (
          <Link
            key={f.key}
            href={f.key ? `/content?status=${f.key}` : "/content"}
            className={`rounded-full border px-3 py-1 text-xs ${
              (status ?? "") === f.key
                ? "border-white bg-white text-zinc-900"
                : "border-zinc-800 text-zinc-400 hover:border-zinc-600"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-800 py-16 text-center text-sm text-zinc-500">
          Belum ada konten di sini. Yuk buat yang pertama.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-800">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-zinc-900/60 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-medium">Judul</th>
                <th className="px-4 py-3 font-medium">Platform</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Tanggal</th>
                <th className="px-4 py-3 font-medium">Worth It?</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {filtered.map((item) => {
                const score = scores.get(item.id)!;
                return (
                  <tr key={item.id} className="hover:bg-zinc-900/40">
                    <td className="px-4 py-3">
                      <Link href={`/content/${item.id}`} className="font-medium hover:underline">
                        {item.title}
                      </Link>
                      <p className="text-xs text-zinc-500">{item.contentType}</p>
                    </td>
                    <td className="px-4 py-3 text-zinc-400">{PLATFORM_LABEL[item.platform]}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full border px-2 py-0.5 text-xs ${STATUS_COLOR[item.status]}`}
                      >
                        {STATUS_LABEL[item.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-400">
                      {formatDate(item.publishedAt ?? item.scheduledAt)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full border px-2 py-0.5 text-xs whitespace-nowrap ${verdictColor[score.verdict]}`}
                      >
                        {verdictLabel[score.verdict]}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
