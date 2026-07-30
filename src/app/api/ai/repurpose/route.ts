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
import { consumeAiQuota, getQuotaStatus } from "@/lib/billing";
import { REPURPOSE_SCHEMA } from "@/lib/ai-schemas";
import { PLATFORM_LABEL } from "@/lib/constants";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

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
  const requested = Number(body?.count);
  const count = Number.isFinite(requested)
    ? Math.min(Math.max(Math.round(requested), 1), 6)
    : 3;

  const item = await prisma.contentItem.findFirst({
    where: { id: contentId, userId: user.id },
    include: { account: true },
  });
  if (!item) return NextResponse.json({ error: "Konten tidak ditemukan" }, { status: 404 });

  if (!item.sourceText?.trim()) {
    return NextResponse.json(
      {
        error:
          "Isi dulu naskah aslinya di kolom 'Naskah / transkrip' pada konten ini. Tanpa itu AI cuma punya judul, dan hasil turunannya bakal dangkal.",
      },
      { status: 422 }
    );
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

  const detail = [
    `Judul: ${item.title}`,
    `Platform asal: ${PLATFORM_LABEL[item.platform]}`,
    `Format asal: ${item.contentType}`,
    item.hook ? `Hook asal: ${item.hook}` : null,
    item.tags.length ? `Tag: ${item.tags.join(", ")}` : null,
    item.status === "PUBLISHED" && item.views
      ? `Performa: ${item.views} views, ${item.likes ?? 0} likes, ${item.saves ?? 0} saves`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  const prompt = `Pecah satu konten yang sudah jadi ini menjadi ${count} konten turunan untuk platform atau format lain.

Detail konten asal:
${detail}

Naskah aslinya:
"""
${item.sourceText.trim().slice(0, 12000)}
"""

Syarat:
- Tiap turunan harus berdiri sendiri — orang yang belum lihat konten aslinya tetap paham.
- Jangan cuma memotong naskah asli. Tulis ulang menyesuaikan kebiasaan platform tujuannya: durasi, gaya bahasa, dan cara membuka.
- Sebarkan ke platform dan format yang berbeda-beda, condongkan ke yang menurut data performanya cocok untuk creator ini.
- Isi bagian body dengan teks yang benar-benar siap dipakai, bukan ringkasan atau instruksi.
- Kalau naskahnya terlalu pendek untuk dipecah sebanyak itu, buat lebih sedikit tapi berkualitas, dan katakan alasannya di bagian reading.`;

  try {
    const context = await buildCreatorContext(user.id);

    const stream = streamAiMessage({
      context,
      messages: [{ role: "user", content: prompt }],
      jsonSchema: REPURPOSE_SCHEMA,
    });

    const message = await stream.finalMessage();

    if (message.stop_reason === "refusal") {
      return NextResponse.json(
        { error: "Permintaan ini ditolak oleh filter keamanan." },
        { status: 422 }
      );
    }

    let parsed: unknown;
    try {
      parsed = parseJsonLoose(textOf(message));
    } catch {
      return NextResponse.json(
        { error: "Jawaban AI tidak bisa dibaca. Coba lagi." },
        { status: 502 }
      );
    }

    await consumeAiQuota(user.id);
    return NextResponse.json({ result: parsed });
  } catch (error) {
    console.error("AI repurpose failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal menghubungi layanan AI" },
      { status: 502 }
    );
  }
}
