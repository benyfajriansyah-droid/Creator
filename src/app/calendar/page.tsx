import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PLATFORM_LABEL, STATUS_COLOR } from "@/lib/constants";

export const dynamic = "force-dynamic";

const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];
const WEEKDAYS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

function parseMonthParam(month?: string): { year: number; monthIndex: number } {
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const [y, m] = month.split("-").map(Number);
    return { year: y, monthIndex: m - 1 };
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
  searchParams: Promise<{ month?: string }>;
}) {
  const { month } = await searchParams;
  const { year, monthIndex } = parseMonthParam(month);

  const monthStart = new Date(year, monthIndex, 1);
  const monthEnd = new Date(year, monthIndex + 1, 1);

  const items = await prisma.contentItem.findMany({
    where: {
      OR: [
        { scheduledAt: { gte: monthStart, lt: monthEnd } },
        { publishedAt: { gte: monthStart, lt: monthEnd } },
      ],
    },
  });

  const byDay = new Map<number, typeof items>();
  for (const item of items) {
    const date = item.publishedAt ?? item.scheduledAt;
    if (!date) continue;
    const d = new Date(date);
    if (d.getMonth() !== monthIndex || d.getFullYear() !== year) continue;
    const day = d.getDate();
    byDay.set(day, [...(byDay.get(day) ?? []), item]);
  }

  const firstWeekday = (monthStart.getDay() + 6) % 7; // 0 = Monday
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const prevMonth = monthIndex === 0 ? { year: year - 1, monthIndex: 11 } : { year, monthIndex: monthIndex - 1 };
  const nextMonth = monthIndex === 11 ? { year: year + 1, monthIndex: 0 } : { year, monthIndex: monthIndex + 1 };

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === monthIndex;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Kalender Konten</h1>
          <p className="text-sm text-zinc-500">
            {MONTH_NAMES[monthIndex]} {year}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/calendar?month=${monthParam(prevMonth.year, prevMonth.monthIndex)}`}
            className="rounded-lg border border-zinc-800 px-3 py-1.5 text-sm hover:bg-zinc-900"
          >
            ← Sebelumnya
          </Link>
          <Link
            href={`/calendar?month=${monthParam(nextMonth.year, nextMonth.monthIndex)}`}
            className="rounded-lg border border-zinc-800 px-3 py-1.5 text-sm hover:bg-zinc-900"
          >
            Berikutnya →
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-zinc-800 bg-zinc-800 text-xs">
        {WEEKDAYS.map((w) => (
          <div key={w} className="bg-zinc-900 px-2 py-2 text-center font-medium text-zinc-500">
            {w}
          </div>
        ))}
        {cells.map((day, idx) => (
          <div
            key={idx}
            className={`min-h-[100px] bg-zinc-950 p-1.5 sm:min-h-[120px] ${
              day && isCurrentMonth && day === today.getDate() ? "ring-1 ring-inset ring-white/40" : ""
            }`}
          >
            {day && (
              <>
                <p className="mb-1 text-zinc-500">{day}</p>
                <div className="flex flex-col gap-1">
                  {(byDay.get(day) ?? []).slice(0, 3).map((item) => (
                    <Link
                      key={item.id}
                      href={`/content/${item.id}`}
                      className={`truncate rounded border px-1.5 py-0.5 text-[11px] ${STATUS_COLOR[item.status]}`}
                      title={item.title}
                    >
                      {item.title}
                    </Link>
                  ))}
                  {(byDay.get(day)?.length ?? 0) > 3 && (
                    <span className="text-[10px] text-zinc-500">
                      +{(byDay.get(day)?.length ?? 0) - 3} lagi
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      <p className="mt-4 text-xs text-zinc-500">
        Platform terjadwal bulan ini:{" "}
        {[...new Set(items.map((i) => PLATFORM_LABEL[i.platform]))].join(", ") || "-"}
      </p>
    </div>
  );
}
