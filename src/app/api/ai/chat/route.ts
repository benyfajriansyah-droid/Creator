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
import { consumeAiQuota, getQuotaStatus } from "@/lib/billing";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const MAX_HISTORY = 24;

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
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  const threadIdInput = typeof body?.threadId === "string" ? body.threadId : null;

  if (!message) {
    return NextResponse.json({ error: "Pesan kosong" }, { status: 400 });
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

  // Only continue a thread the caller actually owns; otherwise start a new one.
  const existing = threadIdInput
    ? await prisma.aiThread.findFirst({
        where: { id: threadIdInput, userId: user.id },
        select: { id: true },
      })
    : null;

  const thread =
    existing ??
    (await prisma.aiThread.create({
      data: {
        userId: user.id,
        title: message.length > 60 ? `${message.slice(0, 57)}…` : message,
      },
      select: { id: true },
    }));

  const history = await prisma.aiMessage.findMany({
    where: { threadId: thread.id },
    orderBy: { createdAt: "asc" },
    take: MAX_HISTORY,
    select: { role: true, content: true },
  });

  await prisma.aiMessage.create({
    data: { threadId: thread.id, role: "USER", content: message },
  });

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
      ...history.map((m) => ({
        role: m.role === "USER" ? ("user" as const) : ("assistant" as const),
        content: m.content,
      })),
      { role: "user" as const, content: message },
    ],
  });

  const encoder = new TextEncoder();

  const body$ = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: unknown) =>
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));

      send({ type: "thread", threadId: thread.id });

      let answer = "";
      try {
        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            answer += event.delta.text;
            send({ type: "delta", text: event.delta.text });
          }
        }

        const final = await stream.finalMessage();
        if (final.stop_reason === "refusal") {
          send({
            type: "error",
            error: "Permintaan ini ditolak oleh filter keamanan. Coba ubah kalimatnya.",
          });
        } else {
          await prisma.aiMessage.create({
            data: { threadId: thread.id, role: "ASSISTANT", content: answer },
          });
          await prisma.aiThread.update({
            where: { id: thread.id },
            data: { updatedAt: new Date() },
          });
          await consumeAiQuota(user.id);
          send({ type: "done" });
        }
      } catch (error) {
        console.error("AI chat failed", error);
        send({
          type: "error",
          error:
            error instanceof Error ? error.message : "Gagal menghubungi layanan AI",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(body$, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
