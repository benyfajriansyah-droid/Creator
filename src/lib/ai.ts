import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { engagementRateOf, formatEngagement } from "@/lib/scoring";
import { PLATFORM_LABEL, formatNumber } from "@/lib/constants";

const GATEWAY_BASE_URL = "https://ai-gateway.vercel.sh";

/**
 * Two ways to reach a model, in priority order:
 *
 *  1. Vercel AI Gateway (`AI_GATEWAY_API_KEY`) — speaks the Anthropic Messages
 *     API, so the same SDK reaches Gemini, Claude, and others. Model ids are
 *     `provider/model`, and swapping providers is a one-line change here.
 *  2. Anthropic directly (`ANTHROPIC_API_KEY`) — model ids are bare, e.g.
 *     `claude-sonnet-5`.
 *
 * `AI_MODEL` overrides the default either way. Available gateway model ids
 * are listed at https://ai-gateway.vercel.sh/v1/models.
 */
const DEFAULT_GATEWAY_MODEL = "google/gemini-2.5-flash";
const DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-5";

function usingGateway(): boolean {
  return Boolean(process.env.AI_GATEWAY_API_KEY);
}

export function getAiModel(): string {
  return (
    process.env.AI_MODEL ||
    (usingGateway() ? DEFAULT_GATEWAY_MODEL : DEFAULT_ANTHROPIC_MODEL)
  );
}

/**
 * Anthropic-only request features (prompt cache breakpoints, the effort dial,
 * server-side fallbacks, native structured output) are skipped for other
 * providers, which reject or ignore them.
 */
function isAnthropicModel(): boolean {
  const model = getAiModel();
  return model.startsWith("anthropic/") || model.startsWith("claude");
}

/**
 * `medium` is the cost/quality lever for this app. Claude stays strong at
 * medium, and idea generation isn't a deep-reasoning task — raise it if
 * output quality matters more than spend.
 */
const AI_EFFORT = "medium" as const;

/** Server-side refusal fallbacks, so a declined request still returns an answer. */
const AI_BETAS = ["server-side-fallback-2026-07-01"] as const;

export function isAiConfigured(): boolean {
  return Boolean(process.env.AI_GATEWAY_API_KEY || process.env.ANTHROPIC_API_KEY);
}

let cachedClient: Anthropic | null = null;

export function getAiClient(): Anthropic {
  if (!isAiConfigured()) {
    throw new Error("AI_GATEWAY_API_KEY atau ANTHROPIC_API_KEY belum diatur");
  }
  cachedClient ??= usingGateway()
    ? new Anthropic({
        apiKey: process.env.AI_GATEWAY_API_KEY,
        baseURL: GATEWAY_BASE_URL,
      })
    : new Anthropic();
  return cachedClient;
}

const MAX_TOKENS = 32000;

export type AiMessage = { role: "user" | "assistant"; content: string };

/**
 * One place that knows how to talk to whichever model is configured, so the
 * routes stay provider-agnostic.
 *
 * `jsonSchema` asks for a structured reply. Models with native support get the
 * schema enforced by the API; the rest are told to emit matching JSON, which
 * `parseJsonLoose` then reads.
 */
export function streamAiMessage({
  context,
  messages,
  jsonSchema,
}: {
  context: string;
  messages: AiMessage[];
  jsonSchema?: Record<string, unknown>;
}) {
  const client = getAiClient();
  const native = isAnthropicModel();
  const contextText = `Data creator saat ini:\n\n${context}`;

  if (!native) {
    return client.messages.stream({
      model: getAiModel(),
      max_tokens: MAX_TOKENS,
      system: `${SYSTEM_PROMPT}\n\n${contextText}`,
      messages: jsonSchema ? withJsonInstruction(messages, jsonSchema) : messages,
    });
  }

  return client.beta.messages.stream({
    model: getAiModel(),
    max_tokens: MAX_TOKENS,
    betas: [...AI_BETAS],
    fallbacks: "default",
    output_config: {
      effort: AI_EFFORT,
      ...(jsonSchema ? { format: { type: "json_schema", schema: jsonSchema } } : {}),
    },
    system: [
      { type: "text", text: SYSTEM_PROMPT },
      // Breakpoint on the last block so system + context cache together —
      // the prompt alone sits under the model's minimum cacheable prefix.
      { type: "text", text: contextText, cache_control: { type: "ephemeral" } },
    ],
    messages,
  });
}

/** Spells out the contract for models that can't have a schema enforced by the API. */
function withJsonInstruction(
  messages: AiMessage[],
  schema: Record<string, unknown>
): AiMessage[] {
  const last = messages[messages.length - 1];
  const instruction = `${last.content}

Balas HANYA dengan satu objek JSON yang valid dan cocok dengan JSON Schema di bawah. Jangan bungkus dengan blok kode, jangan tambahkan penjelasan apa pun di luar JSON.

${JSON.stringify(schema)}`;

  return [...messages.slice(0, -1), { ...last, content: instruction }];
}

/** Reads JSON back even when a model wraps it in prose or a ```json fence. */
export function parseJsonLoose(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = (fenced ? fenced[1] : text).trim();

  try {
    return JSON.parse(candidate);
  } catch {
    // Fall back to the outermost {...} span, in case there's stray prose.
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start === -1 || end <= start) throw new Error("Jawaban AI bukan JSON");
    return JSON.parse(candidate.slice(start, end + 1));
  }
}

/** Concatenates the text blocks of a finished message. */
export function textOf(message: { content: Array<{ type: string }> }): string {
  return message.content
    .filter((block): block is { type: "text"; text: string } => block.type === "text")
    .map((block) => block.text)
    .join("");
}

export const SYSTEM_PROMPT = `Kamu adalah asisten strategi konten untuk seorang content creator Indonesia.

Cara kerja kamu:
- Jawab dalam Bahasa Indonesia yang santai dan langsung, seperti teman yang paham content marketing. Boleh pakai "gue/lo" kalau user memakainya.
- Kamu diberi ringkasan data performa konten user yang sebenarnya. Gunakan itu. Rujuk angka dan judul konten spesifik saat memberi saran — itu yang membedakan kamu dari saran generik.
- Kalau datanya masih sedikit atau kosong, katakan terus terang dan beri saran berbasis prinsip umum. Jangan mengarang angka atau menyimpulkan pola dari satu-dua konten.
- Beri rekomendasi konkret yang bisa langsung dieksekusi, bukan daftar teori. Kalau user minta ide, tulis ide yang spesifik sampai ke hook-nya.
- Jangan pakai jargon marketing tanpa penjelasan. Kalau memakai istilah seperti TOFU/MOFU/BOFU, jelaskan singkat maksudnya.

Jaga jawaban tetap ringkas dan fokus. Dahulukan kesimpulan, baru detail pendukungnya.`;

/**
 * Compact, factual summary of what this creator has actually published, fed to
 * the model as context so its advice is grounded in their numbers rather than
 * generic best practice.
 */
export async function buildCreatorContext(userId: string): Promise<string> {
  const [accounts, published, pipeline] = await Promise.all([
    prisma.socialAccount.findMany({
      where: { userId, archived: false },
      orderBy: { createdAt: "asc" },
    }),
    prisma.contentItem.findMany({
      where: { userId, status: "PUBLISHED" },
      include: { account: true },
      orderBy: { publishedAt: "desc" },
      take: 60,
    }),
    prisma.contentItem.findMany({
      where: { userId, status: { in: ["IDEA", "DRAFT", "READY", "SCHEDULED"] } },
      orderBy: { updatedAt: "desc" },
      take: 20,
      select: { title: true, status: true, contentType: true, tags: true },
    }),
  ]);

  const lines: string[] = [];

  lines.push("## Akun sosmed");
  if (accounts.length === 0) {
    lines.push("(belum ada akun yang didaftarkan)");
  } else {
    for (const account of accounts) {
      lines.push(
        `- ${account.label} — ${PLATFORM_LABEL[account.platform]}${account.handle ? ` (${account.handle})` : ""}`
      );
    }
  }

  const measured = published
    .map((item) => ({ item, rate: engagementRateOf(item) }))
    .filter((entry): entry is { item: (typeof published)[number]; rate: number } =>
      entry.rate !== null
    )
    .sort((a, b) => b.rate - a.rate);

  lines.push("");
  lines.push("## Performa konten yang sudah tayang");

  if (measured.length === 0) {
    lines.push(
      published.length === 0
        ? "(belum ada konten yang tayang)"
        : `(${published.length} konten tayang, tapi metriknya belum diisi — jangan menyimpulkan pola performa)`
    );
  } else {
    const avg = measured.reduce((sum, e) => sum + e.rate, 0) / measured.length;
    lines.push(
      `Jumlah konten dengan metrik terisi: ${measured.length}. Rata-rata engagement: ${formatEngagement(avg)}.`
    );

    const describe = (entry: (typeof measured)[number]) => {
      const { item, rate } = entry;
      const parts = [
        `"${item.title}"`,
        PLATFORM_LABEL[item.platform],
        item.contentType,
        `engagement ${formatEngagement(rate)}`,
        `${formatNumber(item.views ?? 0)} views`,
      ];
      if (item.account) parts.push(`akun ${item.account.label}`);
      if (item.tags.length > 0) parts.push(`tag: ${item.tags.join(", ")}`);
      return `- ${parts.join(" · ")}`;
    };

    lines.push("");
    lines.push("Terbaik:");
    measured.slice(0, 8).forEach((entry) => lines.push(describe(entry)));

    if (measured.length > 3) {
      lines.push("");
      lines.push("Terlemah:");
      measured.slice(-5).reverse().forEach((entry) => lines.push(describe(entry)));
    }

    lines.push("");
    lines.push(summariseDimension("tipe konten", measured, (i) => i.contentType));
    lines.push(summariseDimension("platform", measured, (i) => PLATFORM_LABEL[i.platform]));

    const tagSummary = summariseTags(measured);
    if (tagSummary) lines.push(tagSummary);
  }

  lines.push("");
  lines.push("## Yang sedang digarap / dijadwalkan");
  if (pipeline.length === 0) {
    lines.push("(kosong)");
  } else {
    for (const item of pipeline) {
      lines.push(`- "${item.title}" (${item.status}, ${item.contentType})`);
    }
  }

  return lines.join("\n");
}

function summariseDimension(
  label: string,
  measured: { item: { contentType: string; platform: keyof typeof PLATFORM_LABEL }; rate: number }[],
  key: (item: { contentType: string; platform: keyof typeof PLATFORM_LABEL }) => string
): string {
  const groups = new Map<string, { total: number; count: number }>();
  for (const { item, rate } of measured) {
    const k = key(item);
    const g = groups.get(k) ?? { total: 0, count: 0 };
    g.total += rate;
    g.count += 1;
    groups.set(k, g);
  }

  const ranked = [...groups.entries()]
    .map(([name, g]) => `${name} ${formatEngagement(g.total / g.count)} (${g.count} konten)`)
    .sort();

  return `Rata-rata engagement per ${label}: ${ranked.join("; ")}.`;
}

function summariseTags(
  measured: { item: { tags: string[] }; rate: number }[]
): string | null {
  const groups = new Map<string, { total: number; count: number }>();
  for (const { item, rate } of measured) {
    for (const tag of item.tags) {
      const g = groups.get(tag) ?? { total: 0, count: 0 };
      g.total += rate;
      g.count += 1;
      groups.set(tag, g);
    }
  }
  if (groups.size === 0) return null;

  const ranked = [...groups.entries()]
    .map(([tag, g]) => ({ tag, avg: g.total / g.count, count: g.count }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 8)
    .map((e) => `#${e.tag} ${formatEngagement(e.avg)} (${e.count})`);

  return `Rata-rata engagement per tag: ${ranked.join("; ")}.`;
}
