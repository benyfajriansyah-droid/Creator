import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { scoreContent, verdictLabel, verdictColor } from "@/lib/scoring";
import { updateContent, logMetrics, deleteContent } from "@/app/actions";
import ContentForm from "@/components/ContentForm";
import MetricsForm from "@/components/MetricsForm";
import DeleteButton from "@/components/DeleteButton";

export const dynamic = "force-dynamic";

export default async function ContentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const item = await prisma.contentItem.findUnique({ where: { id } });
  if (!item) notFound();

  const score = scoreContent([item]).get(item.id)!;
  const updateWithId = updateContent.bind(null, id);
  const logMetricsWithId = logMetrics.bind(null, id);
  const deleteWithId = deleteContent.bind(null, id);

  return (
    <div className="max-w-3xl">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{item.title}</h1>
          <span
            className={`mt-2 inline-block rounded-full border px-2 py-0.5 text-xs ${verdictColor[score.verdict]}`}
          >
            {verdictLabel[score.verdict]}
            {score.engagementRate !== null &&
              ` · ${(score.engagementRate * 100).toFixed(1)}% engagement`}
          </span>
        </div>
        <DeleteButton action={deleteWithId} />
      </div>

      <div className="grid gap-8 sm:grid-cols-2">
        <section>
          <h2 className="mb-3 text-sm font-semibold text-zinc-300">Detail Konten</h2>
          <ContentForm item={item} action={updateWithId} />
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold text-zinc-300">Performa (input manual)</h2>
          <MetricsForm item={item} action={logMetricsWithId} />
        </section>
      </div>
    </div>
  );
}
