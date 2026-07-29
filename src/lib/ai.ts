import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { engagementRateOf, formatEngagement } from "@/lib/scoring";
import { PLATFORM_LABEL, formatNumber } from "@/lib/constants";

export const AI_MODEL = "claude-opus-5";

/**
 * `medium` is the cost/quality lever for this app. Opus 5 stays strong at
 * medium, and idea generation isn't a deep-reasoning task — raise it if
 * output quality matters more than spend.
 */
export const AI_EFFORT = "medium" as const;

/** Server-side refusal fallbacks, so a declined request still returns an answer. */
export const AI_BETAS = ["server-side-fallback-2026-07-01"] as const;

export function isAiConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

let cachedClient: Anthropic | null = null;

export function getAiClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY belum diatur");
  }
  cachedClient ??= new Anthropic();
  return cachedClient;
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
