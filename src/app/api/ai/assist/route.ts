import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import {
  buildCreatorContext,
  isAiConfigured,
  streamAiMessage,
  textOf,
} from "@/lib/ai";
import { getQuotaStatus, releaseAiQuota, reserveAiQuota } from "@/lib/billing";
import { clientIdentifier, rateLimit } from "@/lib/rate-limit";
import { PLATFORM_LABEL } from "@/lib/constants";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const TASKS = {
  hooks: "Tulis 6 variasi hook (kalimat pembuka) untuk konten ini. Buat tiap variasi memakai sudut yang berbeda — rasa penasaran, kontras, angka, pertanyaan, pengakuan pribadi, dan klaim berani. Tandai mana yang paling kamu rekomendasikan dan kenapa.",
  script:
    "Tulis draft script lengkap untuk konten ini, dari hook sampai penutup. Sertakan penanda waktu kasar per bagian dan catatan visual singkat. Sesuaikan panjangnya dengan format kontennya.",
  caption:
    "Tulis caption siap posting untuk konten ini, plus 8-12 hashtag yang relevan. Tambahkan satu variasi caption yang lebih pendek.",
  improve:
    "Konten ini sudah tayang. Berdasarkan angka performanya dibanding konten lain, jelaskan apa yang bisa diperbaiki kalau membuat konten serupa lagi. Beri saran konkret, bukan pujian.",
} as const;

type TaskKey = keyof typeof TASKS;

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
  const task: TaskKey = (Object.keys(TASKS) as TaskKey[]).includes(body?.task)
    ? body.task
    : "hooks";

  const throttle = await rateLimit("ai-assist", `${user.id}:${clientIdentifier(request.headers)}`, {
    limit: 15,
    windowMs: 60 * 1000,
  });
  if (!throttle.allowed) {
    return NextResponse.json({ error: "Terlalu banyak permintaan AI. Coba lagi sebentar." }, {
      status: 429,
      headers: { "Retry-After": String(throttle.retryAfterSeconds) },
    });
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

  const item = await prisma.contentItem.findFirst({
    where: { id: contentId, userId: user.id },
    include: { account: true },
  });
  if (!item) return NextResponse.json({ error: "Konten tidak ditemukan" }, { status: 404 });

  const reservation = await reserveAiQuota(user.id);
  if (!reservation.allowed) {
    return NextResponse.json({ error: "Kuota AI bulan ini habis. Buka Billing buat lanjut." }, { status: 402 });
  }

  const details = [
    `Judul: ${item.title}`,
    `Platform: ${PLATFORM_LABEL[item.platform]}`,
    `Format: ${item.contentType}`,
    item.account ? `Akun: ${item.account.label}` : null,
    item.hook ? `Hook yang ada sekarang: ${item.hook}` : null,
    item.description ? `Brief: ${item.description}` : null,
    item.tags.length ? `Tag: ${item.tags.join(", ")}` : null,
    item.notes ? `Catatan: ${item.notes}` : null,
    item.status === "PUBLISHED" && item.views
      ? `Performa: ${item.views} views, ${item.likes ?? 0} likes, ${item.comments ?? 0} komentar, ${item.shares ?? 0} shares, ${item.saves ?? 0} saves`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const context = await buildCreatorContext(user.id);

    const stream = streamAiMessage({
      context,
      messages: [
        { role: "user", content: `${TASKS[task]}\n\nDetail konten:\n${details}` },
      ],
    });

    const message = await stream.finalMessage();

    if (message.stop_reason === "refusal") {
      await releaseAiQuota(user.id, reservation.charged);
      return NextResponse.json(
        { error: "Permintaan ini ditolak oleh filter keamanan." },
        { status: 422 }
      );
    }

    return NextResponse.json({ text: textOf(message) });
  } catch (error) {
    await releaseAiQuota(user.id, reservation.charged);
    console.error("AI assist failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal menghubungi layanan AI" },
      { status: 502 }
    );
  }
}
