import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notify";
import { formatTime } from "@/lib/constants";
import { dayBounds, hourIn, weekdayIn } from "@/lib/time";
import { generateWeeklyReview } from "@/lib/weekly-review";

export const dynamic = "force-dynamic";
// Weekly reviews call a model, so this run can take a while.
export const maxDuration = 60;

/**
 * How many weekly reviews to generate per run. Each is a model call, and the
 * whole cron shares one timeout — whoever doesn't get one today is picked up on
 * the next day's run, which is why the window below is two days wide.
 */
const WEEKLY_REVIEWS_PER_RUN = 3;

/**
 * How long to leave a published piece alone before asking for its numbers, and
 * how long to wait before asking again. Numbers settle over the first couple of
 * days, and nobody wants this every morning.
 */
const DAY_MS = 24 * 60 * 60 * 1000;
const METRICS_GRACE_DAYS = 3;
const METRICS_REMIND_EVERY_DAYS = 3;

/**
 * Fires three kinds of reminder:
 *   1. Per-item nudge, `reminderLeadMinutes` before a scheduled slot.
 *   2. A once-a-day digest of everything due today.
 *   3. A weekly review written by the model, filed as a saved conversation.
 *   4. A nudge to fill in metrics for pieces that went out days ago and still
 *      have none — without those numbers the scores, insights and AI features
 *      all have nothing to work with.
 * All are idempotent, so running this more often than needed is harmless.
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
  let metricsNudges = 0;
  let weeklyReviews = 0;

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

    // The digest switch doubles as the general "send me scheduled summaries"
    // preference, so it silences the metrics nudge too.
    if (!user.dailyDigestEnabled) continue;
    if (hourIn(user.timeZone, now) !== user.dailyDigestHour) continue;

    const { start, end } = dayBounds(user.timeZone, now);

    const missingMetrics = await prisma.contentItem.count({
      where: {
        userId: user.id,
        status: "PUBLISHED",
        views: null,
        publishedAt: { lt: new Date(now.getTime() - METRICS_GRACE_DAYS * DAY_MS) },
      },
    });

    if (missingMetrics > 0) {
      const nudgedRecently = await prisma.notification.findFirst({
        where: {
          userId: user.id,
          kind: "METRICS_REMINDER",
          createdAt: { gte: new Date(now.getTime() - METRICS_REMIND_EVERY_DAYS * DAY_MS) },
        },
        select: { id: true },
      });

      if (!nudgedRecently) {
        await notify({
          userId: user.id,
          kind: "METRICS_REMINDER",
          title: "Angkanya belum diisi",
          body: `${missingMetrics} konten sudah tayang tapi metriknya masih kosong. Tanpa angka itu, Worth It score dan asisten AI belum bisa menilai apa pun.`,
          href: "/content/metrics",
        });
        metricsNudges += 1;
      }
    }

    // Weekly review, on Monday or Tuesday so a capped run can still catch up.
    if (weeklyReviews < WEEKLY_REVIEWS_PER_RUN) {
      const weekday = weekdayIn(user.timeZone, now);
      const sentThisWeek = await prisma.notification.findFirst({
        where: {
          userId: user.id,
          kind: "WEEKLY_REVIEW",
          createdAt: { gte: new Date(now.getTime() - 6 * DAY_MS) },
        },
        select: { id: true },
      });

      if ((weekday === 1 || weekday === 2) && !sentThisWeek) {
        try {
          const threadId = await generateWeeklyReview(user.id);
          if (threadId) {
            await notify({
              userId: user.id,
              kind: "WEEKLY_REVIEW",
              title: "Rangkuman mingguanmu sudah siap",
              body: "Apa yang terjadi minggu lalu, pola yang mulai kelihatan, dan 3 langkah buat minggu ini.",
              href: `/ai?thread=${threadId}`,
            });
            weeklyReviews += 1;
          }
        } catch (error) {
          // One creator's review failing shouldn't stop everyone else's reminders.
          console.error("Gagal membuat rangkuman mingguan", user.id, error);
        }
      }
    }

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
      href: "/dashboard",
    });
    digests += 1;
  }

  return NextResponse.json({ ok: true, reminders, digests, metricsNudges, weeklyReviews });
}
