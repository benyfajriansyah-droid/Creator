# Creator Studio

Aplikasi manajemen konten untuk content creator: rencanakan, jadwalkan, dan ukur
performa konten dari beberapa akun sosmed dalam satu tempat.

## Fitur

- **Login** — data konten terkunci per akun pengguna.
- **Multi akun sosmed** — kelola Instagram, TikTok, YouTube, dll sekaligus. Tiap
  konten dilabeli akunnya, dengan warna penanda sendiri.
- **Papan konten** — alur kerja Ide → Digarap → Siap Posting → Terjadwal → Tayang.
- **Kalender** — tampilan bulanan semua konten terjadwal dan yang sudah tayang.
- **Checklist produksi** — tiap konten punya langkah kerja yang bisa dicentang.
- **Notifikasi HP** — install ke home screen (PWA), lalu dapat push notification
  untuk pengingat sebelum jadwal tayang dan ringkasan harian.
- **Worth It score** — engagement tiap konten dibandingkan dengan rata-rata kamu,
  lalu dilabeli Worth It / Rata-rata / Kurang Worth It.
- **Insight** — perbandingan performa per akun, platform, tipe konten, dan tag.
- **Asisten AI** — tab AI yang membaca data performa kontenmu sendiri:
  - **Tanya AI** — tanya apa saja soal strategi konten; jawabannya merujuk angka
    dan judul konten kamu, bukan saran umum.
  - **Ide Konten** — ide lengkap dengan hook, outline, tag, dan alasan kenapa
    cocok dengan pola performamu. Bisa langsung disimpan ke papan konten.
  - **Funnel TOFU/MOFU/BOFU** — rangkaian konten dari menarik penonton baru,
    membangun kepercayaan, sampai mendorong konversi.
  - **Bantuan per konten** — variasi hook, draft script, caption + hashtag, dan
    evaluasi konten yang sudah tayang.
- **Tema terang & gelap.**

## Yang belum ada

Aplikasi ini **tidak memposting otomatis** ke Instagram/TikTok/YouTube. Auto-posting
butuh akses API resmi tiap platform (akun Business + review aplikasi dari Meta,
approval TikTok Content Posting API, dan seterusnya). Yang tersedia di sini adalah
perencanaan, penjadwalan, pengingat, dan pencatatan hasil.

## Deploy ke Vercel

1. Buka [vercel.com](https://vercel.com), login pakai GitHub, import repo ini.
2. Di tab **Storage** project, buat database **Postgres** (Neon) dan connect ke
   project. Ini otomatis mengisi `DATABASE_URL`. Pastikan **prefix environment
   variable dikosongkan** supaya namanya persis `DATABASE_URL`.
3. Deploy. Migrasi database jalan otomatis lewat script `vercel-build`.

Kunci sesi dan VAPID key untuk push notification dibuat otomatis saat pertama
kali dipakai dan disimpan di database.

Untuk mengaktifkan fitur AI, tambahkan `ANTHROPIC_API_KEY` di environment variable
project Vercel (buat kuncinya di [console.anthropic.com](https://console.anthropic.com)).
Tanpa kunci itu aplikasi tetap berjalan normal — tab AI hanya menampilkan
petunjuk cara mengaktifkannya. Pemakaian AI ditagih per penggunaan ke akun
Anthropic pemilik kunci, jadi perhitungkan biayanya kalau aplikasi ini dipakai
banyak orang.

### Catatan performa

`vercel.json` menyetel region function ke `sin1` (Singapura). Untuk hasil terbaik,
buat database Neon di region yang sama supaya query tidak menyeberang benua.

### Environment variable opsional

| Variabel | Fungsi |
| --- | --- |
| `ANTHROPIC_API_KEY` | Mengaktifkan seluruh fitur AI. Tanpa ini, tab AI menampilkan petunjuk setup dan fitur lain tetap jalan. |
| `CRON_SECRET` | Kalau diisi, endpoint `/api/cron/reminders` hanya menerima request dengan header `Authorization: Bearer <nilai>`. |

## Menjalankan secara lokal

1. `npm install`
2. Salin `.env.example` jadi `.env`, isi `DATABASE_URL` dengan connection string
   Postgres (bisa pakai database Neon yang sama, atau Postgres lokal).
3. `npx prisma migrate deploy`
4. `npm run dev`, lalu buka [http://localhost:3000](http://localhost:3000).

## Stack

- [Next.js](https://nextjs.org) (App Router) + TypeScript
- [Tailwind CSS](https://tailwindcss.com)
- [Prisma](https://www.prisma.io) + Postgres
- Web Push API (`web-push`) untuk notifikasi
- [Claude API](https://platform.claude.com) (`@anthropic-ai/sdk`) untuk fitur AI
