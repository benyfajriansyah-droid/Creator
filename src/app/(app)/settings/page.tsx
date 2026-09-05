import { requireUser } from "@/lib/auth";
import { getVapidKeys } from "@/lib/secrets";
import { updateNotificationSettings } from "@/app/actions";
import { PageHeader, Card, SectionHeading, Field, buttonStyles, inputStyles } from "@/components/ui";
import PushSetup from "@/components/PushSetup";
import DeleteAccountForm from "@/components/DeleteAccountForm";
import Link from "next/link";

export const dynamic = "force-dynamic";

const TIME_ZONES = [
  { value: "Asia/Jakarta", label: "WIB — Jakarta" },
  { value: "Asia/Makassar", label: "WITA — Makassar" },
  { value: "Asia/Jayapura", label: "WIT — Jayapura" },
  { value: "Asia/Singapore", label: "Singapura" },
  { value: "UTC", label: "UTC" },
];

const LEAD_OPTIONS = [
  { value: 15, label: "15 menit sebelum" },
  { value: 30, label: "30 menit sebelum" },
  { value: 60, label: "1 jam sebelum" },
  { value: 180, label: "3 jam sebelum" },
  { value: 720, label: "12 jam sebelum" },
  { value: 1440, label: "1 hari sebelum" },
];

export default async function SettingsPage() {
  const user = await requireUser();
  const { publicKey } = await getVapidKeys();

  return (
    <div className="max-w-2xl">
      <PageHeader title="Pengaturan" description="Notifikasi, waktu, dan akun kamu." />

      <section className="mb-8">
        <SectionHeading
          title="Notifikasi HP"
          description="Install aplikasi ini ke home screen HP untuk pengalaman terbaik."
        />
        <Card className="p-5">
          <PushSetup vapidPublicKey={publicKey} />
        </Card>
      </section>

      <section className="mb-8">
        <SectionHeading title="Preferensi pengingat" />
        <Card className="p-5">
          <form action={updateNotificationSettings} className="space-y-4">
            <Field label="Zona waktu">
              <select name="timeZone" defaultValue={user.timeZone} className={inputStyles}>
                {TIME_ZONES.map((tz) => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field
              label="Pengingat sebelum jadwal tayang"
              hint="Notifikasi dikirim sekali per konten terjadwal."
            >
              <select
                name="reminderLeadMinutes"
                defaultValue={user.reminderLeadMinutes}
                className={inputStyles}
              >
                {LEAD_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>

            <label className="flex items-start gap-3 rounded-lg border border-[var(--border)] p-3">
              <input
                type="checkbox"
                name="dailyDigestEnabled"
                defaultChecked={user.dailyDigestEnabled}
                className="mt-0.5 size-4 accent-[var(--accent)]"
              />
              <span>
                <span className="block text-sm font-medium">Ringkasan harian</span>
                <span className="block text-xs text-[var(--text-muted)]">
                  Satu notifikasi tiap pagi berisi jadwal hari itu dan sisa ide yang
                  menunggu digarap.
                </span>
              </span>
            </label>

            <Field label="Jam ringkasan harian">
              <select
                name="dailyDigestHour"
                defaultValue={user.dailyDigestHour}
                className={inputStyles}
              >
                {Array.from({ length: 24 }, (_, hour) => (
                  <option key={hour} value={hour}>
                    {String(hour).padStart(2, "0")}:00
                  </option>
                ))}
              </select>
            </Field>

            <button type="submit" className={buttonStyles.primary}>
              Simpan Pengaturan
            </button>
          </form>
        </Card>
      </section>

      <section className="mb-8">
        <SectionHeading title="Akun" />
        <Card className="p-5">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-[var(--text-muted)]">Nama</dt>
              <dd className="font-medium">{user.name}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-[var(--text-muted)]">Email</dt>
              <dd className="truncate font-medium">{user.email}</dd>
            </div>
          </dl>
        </Card>
      </section>

      <section className="mb-8">
        <SectionHeading title="Data akun" />
        <Card className="flex flex-wrap items-center justify-between gap-4 p-5">
          <div>
            <p className="text-sm font-medium">Unduh salinan data</p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Berisi konten, metrik, percakapan AI, dan riwayat aktivasi dalam format JSON.
            </p>
          </div>
          <a href="/api/account/export" download className={buttonStyles.secondary}>
            Ekspor data
          </a>
        </Card>
      </section>

      <section className="mb-8">
        <SectionHeading title="Hapus akun" />
        <Card className="border-[var(--danger-border)] p-5">
          <DeleteAccountForm />
        </Card>
      </section>

      <p className="text-xs text-[var(--text-subtle)]">
        Baca <Link href="/privacy" className="underline">Kebijakan Privasi</Link> dan{" "}
        <Link href="/terms" className="underline">Syarat Penggunaan</Link>.
      </p>
    </div>
  );
}
