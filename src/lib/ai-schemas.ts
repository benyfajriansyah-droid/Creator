/**
 * JSON schemas passed to `output_config.format` so generated plans come back
 * as validated objects rather than prose we'd have to parse.
 * Note the API's schema subset: every object needs `additionalProperties: false`
 * and an explicit `required` list, and length/count constraints aren't supported.
 */

export const FORMAT_VALUES = [
  "Video Panjang",
  "Short / Reel",
  "Carousel",
  "Single Post",
  "Story",
  "Livestream",
  "Artikel",
  "Podcast",
] as const;

const ideaProperties = {
  title: { type: "string", description: "Judul konten yang spesifik, bukan topik umum." },
  hook: {
    type: "string",
    description: "Kalimat pembuka 1-2 baris yang bikin orang berhenti scroll.",
  },
  angle: {
    type: "string",
    description: "Sudut pandang atau premis konten dalam satu kalimat.",
  },
  format: { type: "string", enum: [...FORMAT_VALUES] },
  outline: {
    type: "array",
    description: "3-6 poin urutan isi konten.",
    items: { type: "string" },
  },
  tags: {
    type: "array",
    description: "2-4 tag tema, huruf kecil, tanpa tanda pagar.",
    items: { type: "string" },
  },
  whyItWorks: {
    type: "string",
    description:
      "Alasan ide ini cocok, dikaitkan ke data performa creator kalau datanya ada.",
  },
} as const;

const ideaSchema = {
  type: "object",
  properties: ideaProperties,
  required: ["title", "hook", "angle", "format", "outline", "tags", "whyItWorks"],
  additionalProperties: false,
} as const;

export const IDEAS_SCHEMA = {
  type: "object",
  properties: {
    reading: {
      type: "string",
      description:
        "2-3 kalimat rangkuman pola yang terlihat dari data creator. Kalau data belum cukup, katakan begitu.",
    },
    ideas: { type: "array", items: ideaSchema },
  },
  required: ["reading", "ideas"],
  additionalProperties: false,
} as const;

const funnelIdeaSchema = {
  type: "object",
  properties: {
    ...ideaProperties,
    goal: {
      type: "string",
      description: "Apa yang konten ini kejar di tahap funnel-nya.",
    },
    cta: { type: "string", description: "Ajakan bertindak di akhir konten." },
  },
  required: [
    "title",
    "hook",
    "angle",
    "format",
    "outline",
    "tags",
    "whyItWorks",
    "goal",
    "cta",
  ],
  additionalProperties: false,
} as const;

export const FUNNEL_SCHEMA = {
  type: "object",
  properties: {
    strategy: {
      type: "string",
      description:
        "3-5 kalimat menjelaskan alur funnel ini: bagaimana penonton berpindah dari tahap satu ke berikutnya.",
    },
    tofu: {
      type: "array",
      description: "Konten jangkauan luas untuk menarik penonton baru.",
      items: funnelIdeaSchema,
    },
    mofu: {
      type: "array",
      description: "Konten yang membangun kepercayaan dan otoritas.",
      items: funnelIdeaSchema,
    },
    bofu: {
      type: "array",
      description: "Konten yang mendorong konversi atau aksi nyata.",
      items: funnelIdeaSchema,
    },
  },
  required: ["strategy", "tofu", "mofu", "bofu"],
  additionalProperties: false,
} as const;

const repurposedSchema = {
  type: "object",
  properties: {
    title: { type: "string", description: "Judul turunan yang spesifik untuk platform tujuan." },
    platform: {
      type: "string",
      enum: ["YOUTUBE", "INSTAGRAM", "TIKTOK", "TWITTER", "LINKEDIN", "FACEBOOK", "OTHER"],
      description: "Platform tujuan potongan ini.",
    },
    format: { type: "string", enum: [...FORMAT_VALUES] },
    hook: { type: "string", description: "Kalimat pembuka khusus untuk platform tujuan." },
    body: {
      type: "string",
      description:
        "Isi siap pakai: script pendek, teks carousel per slide, atau caption — sesuaikan dengan formatnya. Tulis lengkap, bukan ringkasan.",
    },
    tags: {
      type: "array",
      description: "2-4 tag tema, huruf kecil, tanpa tanda pagar.",
      items: { type: "string" },
    },
    angle: {
      type: "string",
      description:
        "Satu kalimat: bagian mana dari konten asli yang diambil, dan kenapa sudut itu cocok untuk platform tujuan.",
    },
  },
  required: ["title", "platform", "format", "hook", "body", "tags", "angle"],
  additionalProperties: false,
} as const;

export const REPURPOSE_SCHEMA = {
  type: "object",
  properties: {
    reading: {
      type: "string",
      description:
        "1-2 kalimat: inti konten asli dan bagian mana yang paling layak dipecah ulang.",
    },
    pieces: { type: "array", items: repurposedSchema },
  },
  required: ["reading", "pieces"],
  additionalProperties: false,
} as const;

export type RepurposedPiece = {
  title: string;
  platform: string;
  format: string;
  hook: string;
  body: string;
  tags: string[];
  angle: string;
};

export type RepurposeResult = { reading: string; pieces: RepurposedPiece[] };

export type GeneratedIdea = {
  title: string;
  hook: string;
  angle: string;
  format: string;
  outline: string[];
  tags: string[];
  whyItWorks: string;
  goal?: string;
  cta?: string;
};

export type IdeasResult = { reading: string; ideas: GeneratedIdea[] };

export type FunnelResult = {
  strategy: string;
  tofu: GeneratedIdea[];
  mofu: GeneratedIdea[];
  bofu: GeneratedIdea[];
};

export const FUNNEL_STAGES = [
  {
    key: "tofu" as const,
    label: "TOFU — Jangkauan",
    description: "Menarik penonton baru yang belum kenal kamu.",
    tone: "info" as const,
  },
  {
    key: "mofu" as const,
    label: "MOFU — Kepercayaan",
    description: "Meyakinkan yang sudah kenal bahwa kamu layak diikuti.",
    tone: "warning" as const,
  },
  {
    key: "bofu" as const,
    label: "BOFU — Konversi",
    description: "Mengubah pengikut jadi pembeli, klien, atau subscriber.",
    tone: "success" as const,
  },
];
