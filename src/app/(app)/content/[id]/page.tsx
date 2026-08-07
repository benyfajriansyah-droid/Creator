import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { deleteContent, logMetrics, updateContent } from "@/app/actions";
import { scoreContent, formatEngagement } from "@/lib/scoring";
import ContentForm from "@/components/ContentForm";
import MetricsForm from "@/components/MetricsForm";
import Checklist from "@/components/Checklist";
import DeleteButton from "@/components/DeleteButton";
import ContentAssist from "@/components/ai/ContentAssist";
import Repurpose from "@/components/ai/Repurpose";
import AutoReview from "@/components/ai/AutoReview";
import { VerdictBadge, AccountDot } from "@/components/ContentCard";
import { isAiConfigured } from "@/lib/ai";
import { Badge, Card, SectionHeading } from "@/components/ui";
import {
  PLATFORM_LABEL,
  STATUS_LABEL,
  STATUS_TONE,
  formatDateTime,
  formatRupiah,
  relativeTime,
} from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function ContentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();

  const [item, accounts] = await Promise.all([
    prisma.contentItem.findFirst({
      where: { id, userId: user.id },
      include: {
        account: true,
        checklist: { orderBy: { position: "asc" } },
        source: { select: { id: true, title: true } },
        derived: {
          select: { id: true, title: true, platform: true },
          orderBy: { createdAt: "asc" },
        },
      },
    }),
    prisma.socialAccount.findMany({
      where: { userId: user.id, archived: false },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  if (!item) notFound();

  // Judge this item against everything published, not against itself.
  const published = await prisma.contentItem.findMany({
    where: { userId: user.id, status: "PUBLISHED" },
  });
  const pool = item.status === "PUBLISHED" ? published : [...published, item];
  const score = scoreContent(pool).get(item.id)!;

  const updateAction = updateContent.bind(null, id);
  const metricsAction = logMetrics.bind(null, id);
  const deleteAction = deleteContent.bind(null, id);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight break-words">
            {item.title}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge tone={STATUS_TONE[item.status]}>{STATUS_LABEL[item.status]}</Badge>
            <Badge>{PLATFORM_LABEL[item.platform]}</Badge>
            <Badge>{item.contentType}</Badge>
            {item.status === "PUBLISHED" && <VerdictBadge score={score} />}
            <AccountDot account={item.account} />
          </div>
          {item.source && (
            <p className="mt-2 text-xs text-[var(--text-subtle)]">
              Turunan dari{" "}
              <Link
                href={`/content/${item.source.id}`}
                className="text-[var(--accent)] hover:underline"
              >
                {item.source.title}
              </Link>
            </p>
          )}
          {item.scheduledAt && item.status !== "PUBLISHED" && (
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              🗓 Tayang {formatDateTime(item.scheduledAt, user.timeZone)} ·{" "}
              {relativeTime(item.scheduledAt)}
            </p>
          )}
        </div>
        <DeleteButton action={deleteAction} />
      </div>

      {item.status === "PUBLISHED" && score.engagementRate !== null && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MiniStat label="Engagement" value={formatEngagement(score.engagementRate)} />
          <MiniStat
            label="vs rata-rata"
            value={score.vsAverage ? `${(score.vsAverage * 100).toFixed(0)}%` : "—"}
          />
          <MiniStat
            label="Views"
            value={item.views ? item.views.toLocaleString("id-ID") : "—"}
          />
          <MiniStat
            label="Rp / jam"
            value={
              score.revenuePerHour !== null
                ? formatRupiah(Math.round(score.revenuePerHour))
                : "—"
            }
          />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
        <div className="space-y-6">
          <section>
            <SectionHeading title="Detail konten" />
            <Card className="p-5">
              <ContentForm
                item={item}
                accounts={accounts}
                action={updateAction}
                timeZone={user.timeZone}
              />
            </Card>
          </section>
        </div>

        <div className="space-y-6">
          {item.status === "PUBLISHED" && (
            <section>
              <SectionHeading
                title="Analisa otomatis"
                description="Evaluasi performa konten ini, dibanding rata-ratamu sendiri."
              />
              <Card className="p-4">
                <AutoReview
                  contentId={item.id}
                  configured={isAiConfigured()}
                  ready={Boolean(item.views)}
                  storedReview={item.aiReview}
                  reviewedAt={item.aiReviewedAt?.toISOString() ?? null}
                />
              </Card>
            </section>
          )}

          <section>
            <SectionHeading
              title="Bantuan AI"
              description="Hook, script, dan caption untuk konten ini."
            />
            <Card className="p-4">
              <ContentAssist
                contentId={item.id}
                configured={isAiConfigured()}
                isPublished={item.status === "PUBLISHED"}
              />
            </Card>
          </section>

          <section>
            <SectionHeading
              title="Pecah jadi konten lain"
              description="Ubah konten ini jadi versi untuk platform atau format lain."
            />
            <Card className="p-4">
              <Repurpose
                contentId={item.id}
                configured={isAiConfigured()}
                hasSourceText={Boolean(item.sourceText?.trim())}
              />
              {item.derived.length > 0 && (
                <div className="mt-4 border-t border-[var(--border)] pt-3">
                  <p className="text-xs font-medium text-[var(--text-muted)]">
                    Sudah dipecah jadi {item.derived.length} konten
                  </p>
                  <ul className="mt-2 space-y-1.5">
                    {item.derived.map((child) => (
                      <li key={child.id}>
                        <Link
                          href={`/content/${child.id}`}
                          className="text-sm text-[var(--accent)] hover:underline"
                        >
                          {child.title}
                        </Link>{" "}
                        <span className="text-xs text-[var(--text-subtle)]">
                          · {PLATFORM_LABEL[child.platform]}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>
          </section>

          <section>
            <SectionHeading
              title="Checklist produksi"
              description="Pecah kerjaan jadi langkah kecil."
            />
            <Card className="p-4">
              <Checklist contentId={item.id} items={item.checklist} />
            </Card>
          </section>

          <section>
            <SectionHeading
              title="Performa"
              description="Isi manual setelah konten tayang."
            />
            <Card className="p-4">
              <MetricsForm
                item={item}
                action={metricsAction}
                timeZone={user.timeZone}
              />
            </Card>
          </section>

          {item.postUrl && (
            <a
              href={item.postUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block truncate rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--accent)] hover:bg-[var(--surface-muted)]"
            >
              ↗ Buka postingan
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="px-3 py-2.5">
      <p className="text-xs text-[var(--text-muted)]">{label}</p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums">{value}</p>
    </Card>
  );
}
