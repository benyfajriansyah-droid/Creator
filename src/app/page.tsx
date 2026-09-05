import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { PLAN_AI_QUOTA, PLAN_LABEL, PLAN_PRICE } from "@/lib/billing";
import { formatRupiah } from "@/lib/constants";
import { Badge, ButtonLink, Card, buttonStyles } from "@/components/ui";
import ThemeToggle from "@/components/ThemeToggle";
import { Logo } from "@/components/Logo";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Creator Studio — Rencanakan & ukur konten sosmedmu",
  description:
    "Papan konten, kalender, dan skor Worth It yang membandingkan tiap kontenmu dengan rata-ratamu sendiri. Plus asisten AI yang baca data performamu.",
};

/**
 * Real quotes only — leave this empty until there are actual users to quote.
 * The section hides itself while the list is empty.
 */
const TESTIMONIALS: { quote: string; name: string; handle: string }[] = [];

const PAINS = [
  "Ide konten kesebar di Notes HP, draft caption, sama kepala kamu sendiri.",
  "Tahu sebuah konten dapat 40rb views, tapi nggak tahu itu bagus atau biasa aja buat akunmu.",
  "Ada konten yang dulu meledak, tapi lupa apa yang bikin dia meledak.",
];

const FOR_YOU = [
  "Pegang lebih dari satu akun sosmed sekaligus",
  "Posting rutin dan mulai penasaran sama polanya",
  "Capek pindah-pindah antara Notes, kalender, dan spreadsheet",
];

const NOT_FOR_YOU = [
  "Butuh konten kepost otomatis tanpa buka aplikasi sosmednya",
  "Butuh alur approval bertingkat untuk tim besar",
];

const AI_ABILITIES = [
  {
    title: "Tanya AI",
    desc: "Tanya apa saja soal strategi kontenmu, dijawab merujuk angkamu.",
  },
  {
    title: "Ide Konten",
    desc: "Ide lengkap dengan hook, outline, dan alasan kenapa cocok. Bisa langsung disimpan ke papan.",
  },
  {
    title: "Analisa otomatis",
    desc: "Isi angka performanya, dan evaluasinya ditulis sendiri — apa yang jalan, apa yang perlu diubah, dan langkah berikutnya.",
  },
  {
    title: "Pecah jadi konten lain",
    desc: "Tempel naskah aslinya, lalu ubah satu konten jadi beberapa versi untuk platform dan format lain.",
  },
  {
    title: "Bantuan per konten",
    desc: "Variasi hook, draft script, caption + hashtag, dan evaluasi konten yang sudah tayang.",
  },
  {
    title: "Funnel TOFU/MOFU/BOFU",
    desc: "Rangkaian konten dari menarik penonton baru sampai mendorong konversi.",
  },
];

const FAQ = [
  {
    q: "Kontennya bisa langsung kepost otomatis ke Instagram/TikTok?",
    a: "Belum bisa. Auto-posting butuh izin API resmi dari tiap platform — akun Business, review aplikasi dari Meta, approval TikTok, dan seterusnya. Yang Creator Studio kerjakan adalah bagian sebelum dan sesudahnya: merencanakan, menjadwalkan, mengingatkan sebelum waktunya tayang, lalu mencatat hasilnya.",
  },
  {
    q: "Angka views dan likes-nya ditarik otomatis dari akunku?",
    a: "Nggak, kamu isi sendiri setelah konten tayang — sekitar satu menit per konten. Konsekuensinya kamu nggak perlu menyerahkan akses akun sosmedmu ke aplikasi ini sama sekali.",
  },
  {
    q: "Data kontenku bisa dilihat orang lain?",
    a: "Nggak. Semua konten, angka, dan percakapan AI terkunci di akunmu sendiri.",
  },
  {
    q: "Kalau aku berhenti langganan, kontenku hilang?",
    a: "Nggak hilang. Akunmu balik ke plan Gratis — papan konten, kalender, catatan, dan semua angkanya tetap utuh. Yang berhenti cuma akses ke asisten AI.",
  },
  {
    q: "Bedanya sama pakai Notion atau Trello?",
    a: "Notion dan Trello nggak tahu konten mana yang performanya di atas rata-ratamu, karena mereka nggak mengerti isi datanya. Di sini tiap konten otomatis dibandingkan dengan rata-rata kamu sendiri, dan asisten AI-nya menjawab sambil melihat angka itu.",
  },
];

export default async function LandingPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--bg)]/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <Logo textClassName="text-sm font-semibold tracking-tight whitespace-nowrap sm:text-base" />
          </Link>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <ThemeToggle />
            {/* Hidden on phones so the header fits — login is still reachable
                from the footer and the register page. */}
            <span className="hidden sm:block">
              <ButtonLink href="/login" variant="ghost">
                Masuk
              </ButtonLink>
            </span>
            <ButtonLink href="/register" className="whitespace-nowrap">
              Daftar Gratis
            </ButtonLink>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto max-w-3xl px-4 pt-12 pb-10 text-center sm:px-6 sm:pt-20">
          <Badge tone="accent" className="mx-auto">
            Untuk content creator Indonesia
          </Badge>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            Berhenti nebak konten mana yang layak kamu ulang.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-[var(--text-muted)] text-balance">
            Rencanakan, jadwalkan, dan catat hasil konten dari semua akun sosmedmu di satu
            tempat. Creator Studio membandingkan tiap konten dengan rata-ratamu sendiri —
            jadi kamu tahu mana yang benar-benar worth it, bukan cuma yang terasa worth it.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/register" className="px-6 py-3 text-base">
              Mulai Gratis
            </ButtonLink>
            <ButtonLink href="#harga" variant="secondary" className="px-6 py-3 text-base">
              Lihat Harga
            </ButtonLink>
          </div>
          <p className="mt-3 text-xs text-[var(--text-subtle)]">
            Papan konten &amp; kalender gratis selamanya. Tanpa kartu kredit.
          </p>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
          <Shot
            src="/shots/board.webp"
            alt="Papan konten Creator Studio dengan kolom Ide, Digarap, Siap Posting, Terjadwal, dan Tayang"
            priority
          />
        </section>

        {/* Problem */}
        <section className="border-y border-[var(--border)] bg-[var(--surface)]">
          <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
            <h2 className="text-center text-2xl font-semibold tracking-tight">
              Kalau ini kamu banget
            </h2>
            <ul className="mx-auto mt-8 max-w-xl space-y-4">
              {PAINS.map((pain) => (
                <li key={pain} className="flex gap-3 text-[var(--text-muted)]">
                  <span className="mt-0.5 shrink-0 text-[var(--warning)]" aria-hidden>
                    <IconAlert />
                  </span>
                  <span>{pain}</span>
                </li>
              ))}
            </ul>
            <p className="mt-8 text-center text-[var(--text)]">
              Semuanya berujung ke satu hal: kamu bikin konten terus, tapi nggak pernah tahu
              persis apa yang berhasil.
            </p>
          </div>
        </section>

        {/* Features */}
        <section className="mx-auto max-w-6xl space-y-20 px-4 py-20 sm:px-6">
          <Feature
            icon={<IconColumns />}
            eyebrow="Papan &amp; Kalender"
            title="Satu tempat dari ide mentah sampai tayang"
            body="Tiap ide masuk ke papan dan bergerak lewat lima tahap: Ide → Digarap → Siap Posting → Terjadwal → Tayang. Tiap konten dilabeli akunnya, punya checklist produksi sendiri, dan muncul di kalender begitu dijadwalkan. Notifikasi HP mengingatkan sebelum waktunya posting."
            points={[
              "Filter per akun sosmed",
              "Checklist produksi per konten",
              "Pengingat sebelum jadwal tayang",
            ]}
            shot={{
              src: "/shots/calendar.webp",
              alt: "Kalender bulanan Creator Studio berisi konten terjadwal dan yang sudah tayang",
            }}
          />

          <Feature
            reverse
            icon={<IconChart />}
            eyebrow="Worth It score &amp; Insight"
            title="Angka yang dibandingkan dengan dirimu sendiri"
            body="Views 40 ribu itu bagus atau biasa saja? Jawabannya beda buat tiap akun. Creator Studio menghitung engagement tiap konten lalu membandingkannya dengan rata-ratamu, dan melabelinya Worth It, Rata-rata, atau Kurang Worth It. Insight merangkumnya per akun, platform, tipe konten, dan tag."
            points={[
              "Peringkat konten dari engagement tertinggi",
              "Perbandingan per platform & tipe konten",
              "Tag mana yang paling sering nyantol",
            ]}
            shot={{
              src: "/shots/insights.webp",
              alt: "Halaman Insight Creator Studio dengan perbandingan performa per akun, platform, tipe konten, dan tag",
            }}
          />
        </section>

        {/* AI */}
        <section className="border-y border-[var(--border)] bg-[var(--surface)]">
          <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
            <span className="inline-flex size-11 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
              <IconSpark />
            </span>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-balance">
              Asisten AI yang sudah baca data kontenmu
            </h2>
            <p className="mt-4 text-[var(--text-muted)] text-balance">
              Bedanya dengan membuka ChatGPT lalu mengetik &ldquo;kasih ide konten&rdquo;:
              asisten di sini sudah tahu konten mana yang performanya bagus di akunmu, format
              apa yang cocok, dan tema apa yang berulang kali nyantol. Jawabannya menyebut
              judul dan angka kontenmu sendiri.
            </p>
            <div className="mt-8 grid gap-3 text-left sm:grid-cols-2">
              {AI_ABILITIES.map(({ title, desc }, i) => (
                <Card
                  key={title}
                  // An odd count would leave the last card stranded half-width.
                  className={`p-4 ${
                    i === AI_ABILITIES.length - 1 && AI_ABILITIES.length % 2 === 1
                      ? "sm:col-span-2"
                      : ""
                  }`}
                >
                  <h3 className="text-sm font-semibold">{title}</h3>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">{desc}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Fit */}
        <section className="mx-auto max-w-4xl px-4 py-20 sm:px-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="p-6">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <span className="text-[var(--success)]" aria-hidden>
                  <IconCheck />
                </span>
                Cocok kalau kamu
              </h3>
              <ul className="mt-4 space-y-2.5 text-sm text-[var(--text-muted)]">
                {FOR_YOU.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </Card>
            <Card className="p-6">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <span className="text-[var(--text-subtle)]" aria-hidden>
                  <IconCross />
                </span>
                Belum cocok kalau kamu
              </h3>
              <ul className="mt-4 space-y-2.5 text-sm text-[var(--text-muted)]">
                {NOT_FOR_YOU.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </Card>
          </div>
        </section>

        {TESTIMONIALS.length > 0 && (
          <section className="border-y border-[var(--border)] bg-[var(--surface)]">
            <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
              <h2 className="text-center text-2xl font-semibold tracking-tight">
                Kata yang sudah pakai
              </h2>
              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                {TESTIMONIALS.map((t) => (
                  <Card key={t.name} className="p-5">
                    <p className="text-sm text-[var(--text)]">&ldquo;{t.quote}&rdquo;</p>
                    <p className="mt-3 text-xs text-[var(--text-muted)]">
                      {t.name} · {t.handle}
                    </p>
                  </Card>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Pricing */}
        <section id="harga" className="mx-auto max-w-5xl scroll-mt-16 px-4 py-20 sm:px-6">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-semibold tracking-tight">Harga</h2>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Semua fitur perencanaan gratis selamanya. Yang berbayar cuma asisten AI-nya.
            </p>
          </div>

          <div className="mx-auto grid max-w-3xl gap-4 sm:grid-cols-2">
            <PlanCard
              name={PLAN_LABEL.FREE}
              price={PLAN_PRICE.FREE}
              tagline="Coba dulu semua fitur perencanaannya, tanpa batas waktu."
              features={[
                "Papan konten & kalender tanpa batas",
                "Multi akun sosmed",
                "Checklist produksi per konten",
                "Worth It score & Insight",
                "Notifikasi HP (PWA)",
              ]}
              excluded={["Asisten AI"]}
              cta="Mulai Gratis"
              href="/register"
              variant="secondary"
            />
            <PlanCard
              featured
              name={PLAN_LABEL.PRO}
              price={PLAN_PRICE.PRO}
              tagline="Buat creator yang posting rutin dan mau dibantu AI."
              features={[
                "Semua fitur Gratis",
                `Asisten AI — ${PLAN_AI_QUOTA.PRO} aksi/bulan`,
                "Analisa otomatis tiap konten yang tayang",
                "Ide konten, hook, script & caption",
                "Pecah satu konten jadi beberapa versi",
                "Funnel TOFU/MOFU/BOFU",
              ]}
              cta="Daftar & Langganan Pro"
              href="/register?next=/billing"
            />
          </div>
          <p className="mx-auto mt-6 max-w-2xl text-center text-xs text-[var(--text-subtle)]">
            Satu &ldquo;aksi AI&rdquo; = sekali generate — misalnya satu set ide konten, satu
            draft script, atau satu jawaban di Tanya AI. Pembayaran Pro diproses lewat
            lynk.id, dan akunmu diaktifkan setelah pembayarannya masuk.
          </p>
        </section>

        {/* FAQ */}
        <section className="border-t border-[var(--border)] bg-[var(--surface)]">
          <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
            <h2 className="text-center text-2xl font-semibold tracking-tight">
              Pertanyaan yang sering muncul
            </h2>
            <div className="mt-8 space-y-3">
              {FAQ.map((item) => (
                <details
                  key={item.q}
                  className="group rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium marker:content-none">
                    {item.q}
                    <span
                      className="shrink-0 text-[var(--text-muted)] transition-transform group-open:rotate-45"
                      aria-hidden
                    >
                      <IconPlus />
                    </span>
                  </summary>
                  <p className="mt-3 text-sm text-[var(--text-muted)]">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="mx-auto max-w-2xl px-4 py-20 text-center sm:px-6">
          <h2 className="text-3xl font-semibold tracking-tight text-balance">
            Coba dulu, gratis.
          </h2>
          <p className="mt-4 text-[var(--text-muted)] text-balance">
            Daftar, masukkan beberapa konten yang sudah tayang beserta angkanya, dan lihat
            sendiri konten mana yang ternyata paling worth it buat kamu.
          </p>
          <div className="mt-8">
            <ButtonLink href="/register" className="px-6 py-3 text-base">
              Daftar Gratis
            </ButtonLink>
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--border)] px-4 py-8 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 text-xs text-[var(--text-subtle)]">
          <span>© {new Date().getFullYear()} Creator Studio</span>
          <span className="flex gap-4">
            <Link href="/privacy" className="hover:text-[var(--text)]">
              Privasi
            </Link>
            <Link href="/terms" className="hover:text-[var(--text)]">
              Syarat
            </Link>
            <Link href="/login" className="hover:text-[var(--text)]">
              Masuk
            </Link>
            <Link href="/register" className="hover:text-[var(--text)]">
              Daftar
            </Link>
          </span>
        </div>
      </footer>
    </div>
  );
}

/** Product screenshot in a framed, slightly inset container. */
function Shot({
  src,
  alt,
  priority = false,
}: {
  src: string;
  alt: string;
  priority?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow)]">
      <Image
        src={src}
        alt={alt}
        width={1760}
        height={1100}
        priority={priority}
        className="h-auto w-full"
      />
    </div>
  );
}

function Feature({
  icon,
  eyebrow,
  title,
  body,
  points,
  shot,
  reverse = false,
}: {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  body: string;
  points: string[];
  shot: { src: string; alt: string };
  reverse?: boolean;
}) {
  return (
    <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
      <div className={reverse ? "lg:order-2" : undefined}>
        <span className="inline-flex size-10 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
          {icon}
        </span>
        <p className="mt-4 text-xs font-medium tracking-wide text-[var(--accent)] uppercase">
          {eyebrow}
        </p>
        <h2 className="mt-1.5 text-2xl font-semibold tracking-tight text-balance">{title}</h2>
        <p className="mt-3 text-[var(--text-muted)]">{body}</p>
        <ul className="mt-5 space-y-2">
          {points.map((point) => (
            <li key={point} className="flex gap-2.5 text-sm text-[var(--text-muted)]">
              <span className="mt-0.5 shrink-0 text-[var(--success)]" aria-hidden>
                <IconCheck />
              </span>
              {point}
            </li>
          ))}
        </ul>
      </div>
      <div className={reverse ? "lg:order-1" : undefined}>
        <Shot src={shot.src} alt={shot.alt} />
      </div>
    </div>
  );
}

function PlanCard({
  name,
  price,
  tagline,
  features,
  excluded = [],
  cta,
  href,
  external = false,
  variant = "primary",
  featured = false,
}: {
  name: string;
  price: number;
  tagline: string;
  features: string[];
  excluded?: string[];
  cta: string;
  /** Either an in-app route or, for the paid plan, the lynk.id checkout. */
  href: string;
  external?: boolean;
  variant?: "primary" | "secondary";
  featured?: boolean;
}) {
  return (
    <Card
      className={`flex flex-col p-6 ${
        featured ? "border-[var(--accent)] ring-1 ring-[var(--accent)]" : ""
      }`}
    >
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold text-[var(--text-muted)]">{name}</h3>
        {featured && <Badge tone="accent">Paling pas</Badge>}
      </div>
      <p className="mt-2 text-3xl font-semibold tracking-tight">
        {price === 0 ? "Rp0" : formatRupiah(price)}
        <span className="text-sm font-normal text-[var(--text-muted)]">/bulan</span>
      </p>
      <p className="mt-2 text-sm text-[var(--text-muted)]">{tagline}</p>
      <ul className="mt-5 flex-1 space-y-2.5 text-sm text-[var(--text-muted)]">
        {features.map((f) => (
          <li key={f} className="flex gap-2">
            <span className="mt-0.5 shrink-0 text-[var(--success)]" aria-hidden>
              <IconCheck />
            </span>
            {f}
          </li>
        ))}
        {excluded.map((f) => (
          <li key={f} className="flex gap-2 text-[var(--text-subtle)]">
            <span className="mt-0.5 shrink-0" aria-hidden>
              <IconCross />
            </span>
            {f}
          </li>
        ))}
      </ul>
      {external ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={`${buttonStyles[variant]} mt-6 w-full`}
        >
          {cta}
        </a>
      ) : (
        <ButtonLink href={href} variant={variant} className="mt-6 w-full">
          {cta}
        </ButtonLink>
      )}
    </Card>
  );
}

/* --- icons --- */
const stroke = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function IconCheck() {
  return (
    <svg {...stroke} width={16} height={16}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
function IconCross() {
  return (
    <svg {...stroke} width={16} height={16}>
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}
function IconPlus() {
  return (
    <svg {...stroke} width={16} height={16}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
function IconAlert() {
  return (
    <svg {...stroke} width={18} height={18}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v4.5M12 16h.01" />
    </svg>
  );
}
function IconColumns() {
  return (
    <svg {...stroke} width={20} height={20}>
      <rect x="3" y="4" width="5" height="16" rx="1.5" />
      <rect x="10" y="4" width="5" height="11" rx="1.5" />
      <rect x="17" y="4" width="4" height="14" rx="1.5" />
    </svg>
  );
}
function IconChart() {
  return (
    <svg {...stroke} width={20} height={20}>
      <path d="M3 3v18h18" />
      <path d="M7 15l4-5 3 3 4-6" />
    </svg>
  );
}
function IconSpark() {
  return (
    <svg {...stroke} width={22} height={22}>
      <path d="M12 3l1.9 4.6L18.5 9.5l-4.6 1.9L12 16l-1.9-4.6L5.5 9.5l4.6-1.9L12 3Z" />
      <path d="M18 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8.8-2Z" />
    </svg>
  );
}
