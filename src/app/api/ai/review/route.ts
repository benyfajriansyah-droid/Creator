import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import {
  buildCreatorContext,
  isAiConfigured,
  parseJsonLoose,
  streamAiMessage,
  textOf,
} from "@/lib/ai";
import { getQuotaStatus, releaseAiQuota, reserveAiQuota } from "@/lib/billing";
import { clientIdentifier, rateLimit } from "@/lib/rate-limit";
import { REVIEW_SCHEMA } from "@/lib/ai-schemas";
import { PLATFORM_LABEL, formatNumber } from "@/lib/constants";
import { formatEngagement, scoreContent, VERDICT_LABEL } from "@/lib/scoring";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Writes the evaluation of a published piece. The client fires this by itself
 * once metrics exist and no review is stored yet, so the analysis arrives
 * without anyone asking for it — but it's stored, and only regenerated when
 * `force` is set, since each run spends part of the account's AI quota.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!isAiConfigured()) {
    return NextResponse.json(
      { error: "Fitur AI belum aktif. Setel AI_GATEWAY_API_KEY dulu." },
      { status: 503 }
    );
  }

  const body = await request.json().catch(() => null);
  const contentId = typeof body?.contentId === "string" ? body.contentId : "";
  const force = body?.force === true;

  const throttle = await rateLimit("ai-review", `${user.id}:${clientIdentifier(request.headers)}`, {
    limit: 10,
    windowMs: 60 * 1000,
  });
  if (!throttle.allowed) {
    return NextResponse.json(
      { error: "Terlalu banyak permintaan AI. Coba lagi sebentar." },
      {
        status: 429,
        headers: { "Retry-After": String(throttle.retryAfterSeconds) },
      }
    );
  }

  const item = await prisma.contentItem.findFirst({
    where: { id: contentId, userId: user.id },
    include: { account: true },
  });
  if (!item) return NextResponse.json({ error: "Konten tidak ditemukan" }, { status: 404 });

  if (item.status !== "PUBLISHED" || !item.views) {
    return NextResponse.json(
      { error: "Konten ini belum tayang atau metriknya belum diisi." },
      { status: 422 }
    );
  }

  // Cheap path: an existing review is served without touching the model, which
  // also keeps a double-mount or a second tab from paying twice.
  if (item.aiReview && !force) {
    return NextResponse.json({ review: item.aiReview, reviewedAt: item.aiReviewedAt });
  }

  const quota = await getQuotaStatus(user.id);
  if (quota.remaining <= 0) {
    return NextResponse.json(
      {
        error: `Kuota AI bulan ini habis (${quota.used}/${quota.limit}). Upgrade plan di halaman Billing buat lanjut.`,
      },
      { status: 402 }
    );
  }

  const reservation = await reserveAiQuota(user.id);
  if (!reservation.allowed) {
    return NextResponse.json(
      { error: "Kuota AI bulan ini habis. Buka Billing buat lanjut." },
      { status: 402 }
    );
  }

  // Judge this piece against everything else published, not against itself.
  const published = await prisma.contentItem.findMany({
    where: { userId: user.id, status: "PUBLISHED" },
  });
  const score = scoreContent(published).get(item.id);

  const detail = [
    `Judul: ${item.title}`,
    `Platform: ${PLATFORM_LABEL[item.platform]}`,
    `Format: ${item.contentType}`,
    item.account ? `Akun: ${item.account.label}` : null,
    item.hook ? `Hook: ${item.hook}` : null,
    item.tags.length ? `Tag: ${item.tags.join(", ")}` : null,
    "",
    `Views: ${formatNumber(item.views)}`,
    `Likes: ${formatNumber(item.likes ?? 0)}`,
    `Komentar: ${formatNumber(item.comments ?? 0)}`,
    `Shares: ${formatNumber(item.shares ?? 0)}`,
    `Saves: ${formatNumber(item.saves ?? 0)}`,
    score?.engagementRate != null
      ? `Engagement rate: ${formatEngagement(score.engagementRate)}`
      : null,
    score?.vsAverage != null
      ? `Dibanding rata-rata creator ini: ${score.vsAverage.toFixed(2)}x (${VERDICT_LABEL[score.verdict]})`
      : `Belum ada pembanding — konten terukur lain masih terlalu sedikit.`,
    item.hoursSpent ? `Waktu produksi: ${item.hoursSpent} jam` : null,
    item.revenue ? `Pendapatan: Rp${formatNumber(item.revenue)}` : null,
  ]
    .filter((line) => line !== null)
    .join("\n");

  const prompt = `Evaluasi satu konten yang sudah tayang ini.

${detail}

Syarat:
- Rujuk angka konkret di atas, terutama perbandingannya dengan rata-rata creator ini. Jangan memuji tanpa dasar.
- Kalau pembandingnya belum ada, katakan terus terang di verdict dan jangan menyimpulkan pola dari satu konten.
- Bagian improve harus bisa langsung dieksekusi di konten berikutnya, bukan nasihat umum seperti "buat konten lebih menarik".
- Bahasa santai dan langsung, maksimal dua kalimat per poin.`;

  try {
    const context = await buildCreatorContext(user.id);

    const stream = streamAiMessage({
      context,
      messages: [{ role: "user", content: prompt }],
      jsonSchema: REVIEW_SCHEMA,
    });

    const message = await stream.finalMessage();

    if (message.stop_reason === "refusal") {
      await releaseAiQuota(user.id, reservation.charged);
      return NextResponse.json(
        { error: "Permintaan ini ditolak oleh filter keamanan." },
        { status: 422 }
      );
    }

    const text = textOf(message);
    try {
      parseJsonLoose(text);
    } catch {
      await releaseAiQuota(user.id, reservation.charged);
      return NextResponse.json(
        { error: "Jawaban AI tidak bisa dibaca. Coba lagi." },
        { status: 502 }
      );
    }

    const reviewedAt = new Date();
    await prisma.contentItem.update({
      where: { id: item.id },
      data: { aiReview: text, aiReviewedAt: reviewedAt },
    });
    return NextResponse.json({ review: text, reviewedAt });
  } catch (error) {
    await releaseAiQuota(user.id, reservation.charged);
    console.error("AI review failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal menghubungi layanan AI" },
      { status: 502 }
    );
  }
}
