import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notify";
import { formatTime } from "@/lib/constants";
import { dayBounds, hourIn } from "@/lib/time";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Fires two kinds of reminder:
 *   1. Per-item nudge, `reminderLeadMinutes` before a scheduled slot.
 *   2. A once-a-day digest of everything due today.
 * Both are idempotent, so running this more often than needed is harmless.
 */
export async function GET(request: Request) {
  // Works with no configuration; set CRON_SECRET to lock the endpoint down.
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  const users = await prisma.user.findMany({
    select: {
      id: true,
      timeZone: true,
      reminderLeadMinutes: true,
      dailyDigestEnabled: true,
      dailyDigestHour: true,
    },
  });

  let reminders = 0;
  let digests = 0;

  for (const user of users) {
    const windowEnd = new Date(now.getTime() + user.reminderLeadMinutes * 60_000);

    const due = await prisma.contentItem.findMany({
      where: {
        userId: user.id,
        status: "SCHEDULED",
        reminderSentAt: null,
        scheduledAt: { gt: now, lte: windowEnd },
      },
      select: { id: true, title: true, scheduledAt: true },
    });

    for (const item of due) {
      await notify({
        userId: user.id,
        kind: "SCHEDULE_REMINDER",
        title: "Waktunya siap-siap posting",
        body: `"${item.title}" dijadwalkan jam ${formatTime(item.scheduledAt, user.timeZone)}.`,
        href: `/content/${item.id}`,
      });
      await prisma.contentItem.update({
        where: { id: item.id },
        data: { reminderSentAt: new Date() },
      });
      reminders += 1;
    }

    if (!user.dailyDigestEnabled) continue;
    if (hourIn(user.timeZone, now) !== user.dailyDigestHour) continue;

    const { start, end } = dayBounds(user.timeZone, now);

    // One digest per local day, guarded by checking for an existing one.
    const alreadySent = await prisma.notification.findFirst({
      where: { userId: user.id, kind: "DAILY_DIGEST", createdAt: { gte: start, lt: end } },
      select: { id: true },
    });
    if (alreadySent) continue;

    const todays = await prisma.contentItem.count({
      where: {
        userId: user.id,
        status: "SCHEDULED",
        scheduledAt: { gte: start, lt: end },
      },
    });
    const backlog = await prisma.contentItem.count({
      where: { userId: user.id, status: { in: ["IDEA", "DRAFT"] } },
    });

    await notify({
      userId: user.id,
      kind: "DAILY_DIGEST",
      title: "Rencana konten hari ini",
      body:
        todays > 0
          ? `${todays} konten dijadwalkan hari ini. ${backlog} ide masih menunggu digarap.`
          : `Belum ada konten terjadwal hari ini. ${backlog} ide siap kamu garap.`,
      href: "/",
    });
    digests += 1;
  }

  return NextResponse.json({ ok: true, reminders, digests });
}
