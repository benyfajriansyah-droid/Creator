import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { isAiConfigured } from "@/lib/ai";
import { PageHeader, Card, Badge } from "@/components/ui";
import Chat from "@/components/ai/Chat";
import Generator from "@/components/ai/Generator";

export const dynamic = "force-dynamic";

const TABS = [
  { key: "chat", label: "Tanya AI" },
  { key: "ideas", label: "Ide Konten" },
  { key: "funnel", label: "Funnel TOFU/MOFU/BOFU" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default async function AiPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; thread?: string }>;
}) {
  const user = await requireUser();
  const { tab, thread } = await searchParams;
  const active: TabKey = TABS.some((t) => t.key === tab) ? (tab as TabKey) : "chat";

  const [accounts, threads] = await Promise.all([
    prisma.socialAccount.findMany({
      where: { userId: user.id, archived: false },
      orderBy: { createdAt: "asc" },
    }),
    prisma.aiThread.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      take: 8,
      select: { id: true, title: true },
    }),
  ]);

  // `?thread=new` starts a blank conversation without creating an empty row.
  const activeThreadId =
    thread === "new" ? null : (thread ?? threads[0]?.id ?? null);
  const history = activeThreadId
    ? await prisma.aiMessage.findMany({
        where: { threadId: activeThreadId, thread: { userId: user.id } },
        orderBy: { createdAt: "asc" },
        select: { role: true, content: true },
      })
    : [];

  const configured = isAiConfigured();

  return (
    <div>
      <PageHeader
        title="Asisten AI"
        description="Strategi konten berdasarkan data performa kamu sendiri, bukan saran generik."
      />

      {!configured && (
        <Card className="mb-6 border-[var(--warning-border)] bg-[var(--warning-bg)] p-4">
          <p className="text-sm font-medium text-[var(--warning)]">
            Fitur AI belum aktif
          </p>
          <p className="mt-1 text-sm text-[var(--text)]">
            Tambahkan environment variable <code>AI_GATEWAY_API_KEY</code> di project
            Vercel kamu (Settings → Environment Variables), lalu deploy ulang. Kuncinya
            ada di tab{" "}
            <a
              href="https://vercel.com/docs/ai-gateway"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium underline"
            >
              AI Gateway
            </a>{" "}
            project Vercel yang sama — tiap bulan dapat kredit gratis, lewat dari itu
            ditagih sesuai pemakaian.
          </p>
        </Card>
      )}

      <div className="mb-6 flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/ai?tab=${t.key}`}
            className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
              active === t.key
                ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                : "border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-strong)]"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {active === "chat" ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_14rem]">
          <div className="min-w-0">
            <Chat
              initialThreadId={activeThreadId}
              initialMessages={history.map((m) => ({
                role: m.role === "USER" ? ("user" as const) : ("assistant" as const),
                content: m.content,
              }))}
            />
          </div>

          <aside className="min-w-0">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Riwayat</h2>
              <Link
                href="/ai?tab=chat&thread=new"
                className="text-xs font-medium text-[var(--accent)] hover:underline"
              >
                + Baru
              </Link>
            </div>
            {threads.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)]">Belum ada percakapan.</p>
            ) : (
              <div className="flex flex-col gap-1">
                {threads.map((t) => (
                  <Link
                    key={t.id}
                    href={`/ai?tab=chat&thread=${t.id}`}
                    className={`truncate rounded-lg px-2.5 py-2 text-xs transition-colors ${
                      t.id === activeThreadId
                        ? "bg-[var(--accent-soft)] font-medium text-[var(--accent)]"
                        : "text-[var(--text-muted)] hover:bg-[var(--surface-muted)]"
                    }`}
                  >
                    {t.title}
                  </Link>
                ))}
              </div>
            )}
          </aside>
        </div>
      ) : (
        <>
          {active === "funnel" && (
            <Card className="mb-6 p-4">
              <p className="mb-2 text-sm font-medium">Apa itu TOFU / MOFU / BOFU?</p>
              <ul className="space-y-1.5 text-sm text-[var(--text-muted)]">
                <li className="flex gap-2">
                  <Badge tone="info">TOFU</Badge>
                  <span>
                    Konten jangkauan luas untuk menarik orang yang belum kenal kamu.
                  </span>
                </li>
                <li className="flex gap-2">
                  <Badge tone="warning">MOFU</Badge>
                  <span>
                    Konten yang membangun kepercayaan — bukti, proses, edukasi mendalam.
                  </span>
                </li>
                <li className="flex gap-2">
                  <Badge tone="success">BOFU</Badge>
                  <span>
                    Konten yang mendorong aksi nyata: beli, daftar, DM, atau klik link.
                  </span>
                </li>
              </ul>
            </Card>
          )}
          <Generator mode={active} accounts={accounts} />
        </>
      )}
    </div>
  );
}
