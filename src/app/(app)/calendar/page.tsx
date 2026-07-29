import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { PageHeader, ButtonLink, Card } from "@/components/ui";
import AccountFilter from "@/components/AccountFilter";
import { STATUS_LABEL, formatTime } from "@/lib/constants";

export const dynamic = "force-dynamic";

const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];
const WEEKDAYS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

function parseMonth(month?: string): { year: number; monthIndex: number } {
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const [y, m] = month.split("-").map(Number);
    if (m >= 1 && m <= 12) return { year: y, monthIndex: m - 1 };
  }
  const now = new Date();
  return { year: now.getFullYear(), monthIndex: now.getMonth() };
}

function monthParam(year: number, monthIndex: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; account?: string }>;
}) {
  const user = await requireUser();
  const { month, account } = await searchParams;
  const { year, monthIndex } = parseMonth(month);

  const monthStart = new Date(year, monthIndex, 1);
  const monthEnd = new Date(year, monthIndex + 1, 1);

  const [items, accounts] = await Promise.all([
    prisma.contentItem.findMany({
      where: {
        userId: user.id,
        ...(account ? { accountId: account } : {}),
        OR: [
          { scheduledAt: { gte: monthStart, lt: monthEnd } },
          { publishedAt: { gte: monthStart, lt: monthEnd } },
        ],
      },
      include: { account: true },
      orderBy: { scheduledAt: "asc" },
    }),
    prisma.socialAccount.findMany({
      where: { userId: user.id, archived: false },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const byDay = new Map<number, typeof items>();
  for (const item of items) {
    const date = item.publishedAt ?? item.scheduledAt;
    if (!date) continue;
    const d = new Date(date);
    if (d.getFullYear() !== year || d.getMonth() !== monthIndex) continue;
    const day = d.getDate();
    byDay.set(day, [...(byDay.get(day) ?? []), item]);
  }

  const firstWeekday = (monthStart.getDay() + 6) % 7; // Monday-first grid
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array<null>(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const prev = monthIndex === 0 ? { year: year - 1, monthIndex: 11 } : { year, monthIndex: monthIndex - 1 };
  const next = monthIndex === 11 ? { year: year + 1, monthIndex: 0 } : { year, monthIndex: monthIndex + 1 };

  const today = new Date();
  const isThisMonth =
    today.getFullYear() === year && today.getMonth() === monthIndex;

  const navHref = (target: { year: number; monthIndex: number }) => {
    const params = new URLSearchParams({ month: monthParam(target.year, target.monthIndex) });
    if (account) params.set("account", account);
    return `/calendar?${params}`;
  };

  return (
    <div>
      <PageHeader
        title="Kalender Konten"
        description={`${MONTHS[monthIndex]} ${year}`}
        action={
          <div className="flex items-center gap-2">
            <Link
              href={navHref(prev)}
              aria-label="Bulan sebelumnya"
              className="flex size-9 items-center justify-center rounded-lg border border-[var(--border-strong)] text-[var(--text-muted)] hover:bg-[var(--surface-muted)]"
            >
              ←
            </Link>
            <Link
              href={navHref(next)}
              aria-label="Bulan berikutnya"
              className="flex size-9 items-center justify-center rounded-lg border border-[var(--border-strong)] text-[var(--text-muted)] hover:bg-[var(--surface-muted)]"
            >
              →
            </Link>
            <ButtonLink href="/content/new">+ Konten</ButtonLink>
          </div>
        }
      />

      <AccountFilter
        accounts={accounts}
        basePath="/calendar"
        selected={account}
        extraParams={{ month: monthParam(year, monthIndex) }}
      />

      <Card className="overflow-hidden">
        <div className="grid grid-cols-7 border-b border-[var(--border)] bg-[var(--surface-muted)]">
          {WEEKDAYS.map((w) => (
            <div
              key={w}
              className="px-2 py-2 text-center text-xs font-medium text-[var(--text-muted)]"
            >
              {w}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {cells.map((day, idx) => {
            const dayItems = day ? (byDay.get(day) ?? []) : [];
            const isToday = Boolean(day) && isThisMonth && day === today.getDate();

            return (
              <div
                key={idx}
                className={`min-h-24 border-r border-b border-[var(--border)] p-1.5 last:border-r-0 sm:min-h-32 ${
                  day ? "" : "bg-[var(--surface-muted)]/40"
                }`}
              >
                {day && (
                  <>
                    <span
                      className={`mb-1 inline-flex size-6 items-center justify-center rounded-full text-xs ${
                        isToday
                          ? "bg-[var(--accent)] font-semibold text-[var(--accent-text)]"
                          : "text-[var(--text-muted)]"
                      }`}
                    >
                      {day}
                    </span>
                    <div className="space-y-1">
                      {dayItems.slice(0, 3).map((item) => (
                        <Link
                          key={item.id}
                          href={`/content/${item.id}`}
                          title={`${item.title} · ${STATUS_LABEL[item.status]}`}
                          className="flex items-center gap-1 rounded px-1 py-0.5 text-[11px] transition-colors hover:bg-[var(--surface-muted)]"
                          style={{
                            backgroundColor: item.account
                              ? `color-mix(in srgb, ${item.account.color} 12%, transparent)`
                              : "var(--surface-muted)",
                          }}
                        >
                          <span
                            className="size-1.5 shrink-0 rounded-full"
                            style={{
                              backgroundColor: item.account?.color ?? "var(--text-subtle)",
                            }}
                            aria-hidden
                          />
                          <span className="truncate text-[var(--text)]">{item.title}</span>
                        </Link>
                      ))}
                      {dayItems.length > 3 && (
                        <p className="px-1 text-[10px] text-[var(--text-subtle)]">
                          +{dayItems.length - 3} lagi
                        </p>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {items.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-3 text-sm font-semibold">Daftar bulan ini</h2>
          <Card className="divide-y divide-[var(--border)]">
            {items.map((item) => (
              <Link
                key={item.id}
                href={`/content/${item.id}`}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--surface-muted)]"
              >
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: item.account?.color ?? "var(--text-subtle)" }}
                  aria-hidden
                />
                <span className="min-w-0 flex-1 truncate text-sm">{item.title}</span>
                <span className="shrink-0 text-xs text-[var(--text-muted)]">
                  {formatTime(item.publishedAt ?? item.scheduledAt, user.timeZone)}
                </span>
              </Link>
            ))}
          </Card>
        </section>
      )}
    </div>
  );
}
