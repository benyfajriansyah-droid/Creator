import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { PLAN_AI_QUOTA, PLAN_LABEL, PLAN_PRICE } from "@/lib/billing";
import { formatRupiah } from "@/lib/constants";
import { Badge, ButtonLink, Card } from "@/components/ui";
import ThemeToggle from "@/components/ThemeToggle";

export const dynamic = "force-dynamic";

const FEATURES = [
  {
    title: "Papan konten",
    desc: "Alur kerja Ide → Digarap → Siap Posting → Terjadwal → Tayang, drag-and-drop kayak Trello.",
    icon: "🗂",
  },
  {
    title: "Kalender & pengingat",
    desc: "Semua jadwal posting kelihatan sebulan penuh, plus notifikasi HP sebelum tayang.",
    icon: "🗓",
  },
  {
    title: "Worth It score",
    desc: "Tiap konten dibandingkan otomatis dengan rata-rata kamu sendiri — ketauan mana yang beneran worth it.",
    icon: "📊",
  },
  {
    title: "Asisten AI",
    desc: "Ide konten, hook, script, caption — semua nyambung ke data performamu sendiri, bukan saran generik.",
    icon: "✨",
  },
];

const PAID_PLANS = (["PRO", "STUDIO"] as const).map((plan) => ({
  plan,
  label: PLAN_LABEL[plan],
  price: PLAN_PRICE[plan],
  quota: PLAN_AI_QUOTA[plan],
}));

export default async function LandingPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-[var(--accent)] text-[var(--accent-text)]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
          <span className="text-base font-semibold tracking-tight">Creator Studio</span>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <ButtonLink href="/login" variant="ghost">
            Masuk
          </ButtonLink>
          <ButtonLink href="/register">Daftar Gratis</ButtonLink>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-3xl px-4 pt-10 pb-16 text-center sm:px-6 sm:pt-16">
          <Badge tone="accent" className="mx-auto">
            Buat content creator Indonesia
          </Badge>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            Berhenti nebak-nebak konten mana yang worth it dibikin lagi.
          </h1>
          <p className="mt-4 text-lg text-[var(--text-muted)] text-balance">
            Rencanakan, jadwalkan, dan ukur performa konten dari semua akun sosmedmu di
            satu tempat — lalu biarkan AI ngasih ide berikutnya berdasarkan data kamu
            sendiri, bukan tips generik dari internet.
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
            Gratis selamanya buat perencanaan &amp; kalender. Tanpa kartu kredit.
          </p>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <Card key={f.title} className="p-5">
                <div className="text-2xl">{f.icon}</div>
                <h3 className="mt-3 text-sm font-semibold">{f.title}</h3>
                <p className="mt-1.5 text-sm text-[var(--text-muted)]">{f.desc}</p>
              </Card>
            ))}
          </div>
        </section>

        <section id="harga" className="mx-auto max-w-5xl scroll-mt-8 px-4 pb-20 sm:px-6">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-semibold tracking-tight">Harga sesuai kebutuhan</h2>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Mulai gratis, upgrade kapan pun butuh bantuan AI lebih banyak.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="flex flex-col p-6">
              <h3 className="text-sm font-semibold text-[var(--text-muted)]">Gratis</h3>
              <p className="mt-2 text-3xl font-semibold tracking-tight">Rp 0</p>
              <ul className="mt-5 flex-1 space-y-2.5 text-sm text-[var(--text-muted)]">
                <li>✓ Papan konten &amp; kalender tanpa batas</li>
                <li>✓ Checklist produksi per konten</li>
                <li>✓ Worth It score &amp; insight performa</li>
                <li>✓ Notifikasi HP (PWA)</li>
                <li className="text-[var(--text-subtle)]">✕ Asisten AI</li>
              </ul>
              <ButtonLink href="/register" variant="secondary" className="mt-6 w-full">
                Mulai Gratis
              </ButtonLink>
            </Card>

            {PAID_PLANS.map(({ plan, label, price, quota }, i) => (
              <Card
                key={plan}
                className={`flex flex-col p-6 ${i === 0 ? "border-[var(--accent)] ring-1 ring-[var(--accent)]" : ""}`}
              >
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-[var(--text-muted)]">{label}</h3>
                  {i === 0 && <Badge tone="accent">Rekomendasi</Badge>}
                </div>
                <p className="mt-2 text-3xl font-semibold tracking-tight">
                  {formatRupiah(price)}
                  <span className="text-sm font-normal text-[var(--text-muted)]">/bulan</span>
                </p>
                <ul className="mt-5 flex-1 space-y-2.5 text-sm text-[var(--text-muted)]">
                  <li>✓ Semua fitur Gratis</li>
                  <li>✓ Asisten AI — {quota} aksi/bulan</li>
                  <li>✓ Ide konten, hook, script &amp; caption</li>
                  <li>✓ Funnel TOFU/MOFU/BOFU</li>
                </ul>
                <ButtonLink href="/register" className="mt-6 w-full">
                  Coba {label}
                </ButtonLink>
              </Card>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--border)] px-4 py-8 text-center text-xs text-[var(--text-subtle)] sm:px-6">
        © {new Date().getFullYear()} Creator Studio. Dibuat buat content creator Indonesia.
      </footer>
    </div>
  );
}
