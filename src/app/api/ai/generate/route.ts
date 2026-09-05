import { NextResponse } from "next/server";
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
import { FUNNEL_SCHEMA, IDEAS_SCHEMA } from "@/lib/ai-schemas";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

type Mode = "ideas" | "funnel";

function buildPrompt(mode: Mode, brief: string, count: number): string {
  if (mode === "funnel") {
    return `Rancang satu rangkaian konten funnel lengkap untuk creator ini.

Brief dari creator: ${brief || "(tidak ada brief khusus — pakai data performa yang ada)"}

Buat ${count} ide untuk tiap tahap:
- TOFU (Top of Funnel): konten jangkauan luas yang menarik orang yang belum kenal creator ini. Prioritaskan rasa penasaran dan potensi dibagikan.
- MOFU (Middle of Funnel): konten yang membangun kepercayaan pada orang yang sudah kenal — bukti, proses, studi kasus, edukasi mendalam.
- BOFU (Bottom of Funnel): konten yang mendorong aksi nyata — beli, daftar, DM, klik link. Tetap terasa natural, bukan hard selling.

Pastikan ada benang merah: konten TOFU harus masuk akal menggiring ke MOFU, lalu ke BOFU. Sebutkan kaitannya di bagian strategy.`;
  }

  return `Buat ${count} ide konten baru untuk creator ini.

Brief dari creator: ${brief || "(tidak ada brief khusus — usulkan berdasarkan pola performa yang terlihat)"}

Syarat:
- Ide harus spesifik sampai bisa langsung dieksekusi, bukan topik umum seperti "bahas tips editing".
- Condongkan ke format, platform, dan tema yang menurut datanya berkinerja baik untuk creator ini, dan sebutkan alasannya di whyItWorks.
- Hindari mengulang konten yang sudah pernah dibuat (lihat daftar di data creator).
- Kalau data performanya belum cukup untuk menyimpulkan pola, katakan itu di bagian reading dan usulkan ide yang menguji beberapa arah berbeda.`;
}

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
  const mode: Mode = body?.mode === "funnel" ? "funnel" : "ideas";
  const brief = typeof body?.brief === "string" ? body.brief.trim().slice(0, 2000) : "";
  const requested = Number(body?.count);
  const count = Number.isFinite(requested)
    ? Math.min(Math.max(Math.round(requested), 1), mode === "funnel" ? 4 : 8)
    : mode === "funnel"
      ? 2
      : 5;

  const throttle = await rateLimit("ai-generate", `${user.id}:${clientIdentifier(request.headers)}`, {
    limit: 10,
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

  const reservation = await reserveAiQuota(user.id);
  if (!reservation.allowed) {
    return NextResponse.json({ error: "Kuota AI bulan ini habis. Buka Billing buat lanjut." }, { status: 402 });
  }

  try {
    const context = await buildCreatorContext(user.id);

    // Streamed so a long generation can't hit the platform's HTTP timeout.
    const stream = streamAiMessage({
      context,
      messages: [{ role: "user", content: buildPrompt(mode, brief, count) }],
      jsonSchema: mode === "funnel" ? FUNNEL_SCHEMA : IDEAS_SCHEMA,
    });

    const message = await stream.finalMessage();

    if (message.stop_reason === "refusal") {
      await releaseAiQuota(user.id, reservation.charged);
      return NextResponse.json(
        { error: "Permintaan ini ditolak oleh filter keamanan. Coba ubah briefnya." },
        { status: 422 }
      );
    }

    let parsed: unknown;
    try {
      parsed = parseJsonLoose(textOf(message));
    } catch {
      await releaseAiQuota(user.id, reservation.charged);
      return NextResponse.json(
        { error: "Jawaban AI tidak bisa dibaca. Coba lagi." },
        { status: 502 }
      );
    }

    return NextResponse.json({ mode, result: parsed });
  } catch (error) {
    await releaseAiQuota(user.id, reservation.charged);
    console.error("AI generate failed", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Gagal menghubungi layanan AI",
      },
      { status: 502 }
    );
  }
}
