"use client";

import { useEffect, useRef, useState } from "react";
import { Card, EmptyState, buttonStyles, inputStyles } from "@/components/ui";

type ChatMessage = { role: "user" | "assistant"; content: string };

const STARTERS = [
  "Konten mana yang paling worth it buat gue lanjutin?",
  "Kenapa engagement gue turun belakangan ini?",
  "Bantu gue tentuin niche yang lebih spesifik",
  "Bikinin 5 variasi hook buat konten tutorial",
];

export default function Chat({
  initialMessages,
  initialThreadId,
}: {
  initialMessages: ChatMessage[];
  initialThreadId: string | null;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [threadId, setThreadId] = useState<string | null>(initialThreadId);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, streaming]);

  async function send(text: string) {
    const question = text.trim();
    if (!question || streaming) return;

    setInput("");
    setError(null);
    setStreaming(true);
    setMessages((prev) => [
      ...prev,
      { role: "user", content: question },
      { role: "assistant", content: "" },
    ]);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: question, threadId }),
      });

      if (!response.ok || !response.body) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? "Gagal menghubungi layanan AI");
      }

      // Newline-delimited JSON: one event object per line.
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          let event: { type: string; text?: string; threadId?: string; error?: string };
          try {
            event = JSON.parse(line);
          } catch {
            continue;
          }

          if (event.type === "thread" && event.threadId) {
            setThreadId(event.threadId);
          } else if (event.type === "delta" && event.text) {
            const chunk = event.text;
            setMessages((prev) => {
              const next = [...prev];
              next[next.length - 1] = {
                role: "assistant",
                content: next[next.length - 1].content + chunk,
              };
              return next;
            });
          } else if (event.type === "error") {
            throw new Error(event.error ?? "Terjadi kesalahan");
          }
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Terjadi kesalahan");
      // Drop the empty assistant bubble so the transcript isn't left dangling.
      setMessages((prev) =>
        prev[prev.length - 1]?.role === "assistant" &&
        prev[prev.length - 1].content === ""
          ? prev.slice(0, -1)
          : prev
      );
    } finally {
      setStreaming(false);
    }
  }

  return (
    <div className="flex flex-col">
      <div className="mb-4 min-h-64 space-y-3">
        {messages.length === 0 ? (
          <EmptyState
            title="Tanya apa aja soal kontenmu"
            description="AI ini bisa melihat data performa konten kamu, jadi jawabannya nyambung dengan angka kamu sendiri — bukan saran umum."
          />
        ) : (
          messages.map((message, i) => (
            <div
              key={i}
              className={message.role === "user" ? "flex justify-end" : "flex justify-start"}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
                  message.role === "user"
                    ? "bg-[var(--accent)] text-[var(--accent-text)]"
                    : "border border-[var(--border)] bg-[var(--surface)] text-[var(--text)]"
                }`}
              >
                {message.content ||
                  (streaming && i === messages.length - 1 ? (
                    <span className="text-[var(--text-muted)]">Sedang berpikir…</span>
                  ) : null)}
              </div>
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>

      {error && (
        <p className="mb-3 rounded-lg border border-[var(--danger-border)] bg-[var(--danger-bg)] px-3 py-2 text-sm text-[var(--danger)]">
          {error}
        </p>
      )}

      {messages.length === 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {STARTERS.map((starter) => (
            <button
              key={starter}
              type="button"
              onClick={() => send(starter)}
              className="rounded-full border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--text-muted)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text)]"
            >
              {starter}
            </button>
          ))}
        </div>
      )}

      <Card className="p-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
          className="flex gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Tulis pertanyaanmu…"
            disabled={streaming}
            className={`${inputStyles} border-transparent focus:border-transparent focus:ring-0`}
          />
          <button
            type="submit"
            disabled={streaming || !input.trim()}
            className={buttonStyles.primary}
          >
            {streaming ? "…" : "Kirim"}
          </button>
        </form>
      </Card>
    </div>
  );
}
