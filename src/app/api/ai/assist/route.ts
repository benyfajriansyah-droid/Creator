import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import {
  AI_BETAS,
  AI_EFFORT,
  AI_MODEL,
  SYSTEM_PROMPT,
  buildCreatorContext,
  getAiClient,
  isAiConfigured,
} from "@/lib/ai";
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
      { error: "Fitur AI belum aktif. Setel ANTHROPIC_API_KEY dulu." },
      { status: 503 }
    );
  }

  const body = await request.json().catch(() => null);
  const contentId = typeof body?.contentId === "string" ? body.contentId : "";
  const task: TaskKey = (Object.keys(TASKS) as TaskKey[]).includes(body?.task)
    ? body.task
    : "hooks";

  const item = await prisma.contentItem.findFirst({
    where: { id: contentId, userId: user.id },
    include: { account: true },
  });
  if (!item) return NextResponse.json({ error: "Konten tidak ditemukan" }, { status: 404 });

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
    const client = getAiClient();

    const stream = client.beta.messages.stream({
      model: AI_MODEL,
      max_tokens: 32000,
      betas: [...AI_BETAS],
      fallbacks: "default",
      output_config: { effort: AI_EFFORT },
      system: [
        { type: "text", text: SYSTEM_PROMPT },
        // Breakpoint on the last block so system + context cache together —
        // the prompt alone sits under the model's minimum cacheable prefix.
        {
          type: "text",
          text: `Data creator saat ini:\n\n${context}`,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        {
          role: "user",
          content: `${TASKS[task]}\n\nDetail konten:\n${details}`,
        },
      ],
    });

    const message = await stream.finalMessage();

    if (message.stop_reason === "refusal") {
      return NextResponse.json(
        { error: "Permintaan ini ditolak oleh filter keamanan." },
        { status: 422 }
      );
    }

    const text = message.content
      .filter((block) => block.type === "text")
      .map((block) => (block as { text: string }).text)
      .join("");

    return NextResponse.json({ text });
  } catch (error) {
    console.error("AI assist failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal menghubungi layanan AI" },
      { status: 502 }
    );
  }
}
