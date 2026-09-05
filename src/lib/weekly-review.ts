import "server-only";
import { prisma } from "@/lib/prisma";
import { buildCreatorContext, isAiConfigured, streamAiMessage, textOf } from "@/lib/ai";
import { getQuotaStatus, releaseAiQuota, reserveAiQuota } from "@/lib/billing";
import { engagementRateOf, formatEngagement } from "@/lib/scoring";
import { PLATFORM_LABEL, formatNumber } from "@/lib/constants";
import { analysePostingTimes } from "@/lib/timing";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Writes the week's read for one creator and files it as a saved conversation,
 * so it lands somewhere they can reply to rather than in a notification body
 * that can't hold it.
 *
 * Returns the thread id, or null when there was nothing to say or no quota to
 * say it with — callers should treat that as "skip", not as a failure.
 */
export async function generateWeeklyReview(userId: string): Promise<string | null> {
  if (!isAiConfigured()) return null;

  const quota = await getQuotaStatus(userId);
  if (quota.remaining <= 0) return null;

  const since = new Date(Date.now() - WEEK_MS);

  const [publishedThisWeek, scheduledNext, backlog, allPublished, user] = await Promise.all([
    prisma.contentItem.findMany({
      where: { userId, status: "PUBLISHED", publishedAt: { gte: since } },
      include: { account: true },
      orderBy: { publishedAt: "desc" },
    }),
    prisma.contentItem.findMany({
      where: {
        userId,
        status: "SCHEDULED",
        scheduledAt: { gte: new Date(), lte: new Date(Date.now() + WEEK_MS) },
      },
      select: { title: true, scheduledAt: true },
      orderBy: { scheduledAt: "asc" },
    }),
    prisma.contentItem.count({ where: { userId, status: { in: ["IDEA", "DRAFT"] } } }),
    prisma.contentItem.findMany({ where: { userId, status: "PUBLISHED" } }),
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { timeZone: true } }),
  ]);

  // Nothing published and nothing lined up means there's no week to review.
  if (publishedThisWeek.length === 0 && scheduledNext.length === 0) return null;

  const reservation = await reserveAiQuota(userId);
  if (!reservation.allowed) return null;

  const lines: string[] = [];

  lines.push(`## Konten yang tayang 7 hari terakhir (${publishedThisWeek.length})`);
  if (publishedThisWeek.length === 0) {
    lines.push("(tidak ada)");
  } else {
    for (const item of publishedThisWeek) {
      const rate = engagementRateOf(item);
      lines.push(
        `- "${item.title}" · ${PLATFORM_LABEL[item.platform]} · ${item.contentType}` +
          (item.views
            ? ` · ${formatNumber(item.views)} views · engagement ${formatEngagement(rate)}`
            : " · metrik belum diisi")
      );
    }
  }

  const timing = analysePostingTimes(allPublished, user.timeZone);
  if (timing.enough && timing.bestBlock) {
    lines.push("");
    lines.push(
      `Pola waktu (dari ${timing.sampleSize} konten): paling nendang ${timing.bestBlock.label.toLowerCase()}` +
        (timing.bestDay ? `, hari ${timing.bestDay.label}` : "") +
        "."
    );
  }

  lines.push("");
  lines.push(`## Terjadwal 7 hari ke depan (${scheduledNext.length})`);
  if (scheduledNext.length === 0) {
    lines.push("(belum ada yang dijadwalkan)");
  } else {
    for (const item of scheduledNext) {
      lines.push(`- "${item.title}"`);
    }
  }
  lines.push("");
  lines.push(`Ide/draft yang menunggu digarap: ${backlog}`);

  const prompt = `Tulis rangkuman mingguan untuk creator ini, seperti partner yang ikut mantau.

${lines.join("\n")}

Susun jadi tiga bagian pendek, pakai heading markdown:
1. **Minggu ini** — apa yang terjadi, rujuk judul dan angkanya. Kalau ada yang menonjol atau anjlok, sebutkan dan tebak kenapa.
2. **Yang kelihatan** — satu pola yang mulai terbaca dari datanya. Kalau datanya belum cukup untuk menyimpulkan apa pun, katakan itu terus terang, jangan dipaksakan.
3. **Minggu depan** — tepat 3 langkah konkret, diurutkan dari yang paling berdampak. Sebut konten atau format spesifik, bukan saran umum.

Maksimal 250 kata. Bahasa santai dan langsung, tanpa basa-basi pembuka.`;

  try {
    const context = await buildCreatorContext(userId);
    const stream = streamAiMessage({ context, messages: [{ role: "user", content: prompt }] });
    const message = await stream.finalMessage();
    if (message.stop_reason === "refusal") {
      await releaseAiQuota(userId, reservation.charged);
      return null;
    }

    const text = textOf(message).trim();
    if (!text) {
      await releaseAiQuota(userId, reservation.charged);
      return null;
    }

    const label = new Date().toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      timeZone: user.timeZone,
    });

    const thread = await prisma.aiThread.create({
      data: {
        userId,
        title: `Rangkuman minggu ini · ${label}`,
        messages: { create: { role: "ASSISTANT", content: text } },
      },
      select: { id: true },
    });

    return thread.id;
  } catch (error) {
    await releaseAiQuota(userId, reservation.charged);
    throw error;
  }
}
