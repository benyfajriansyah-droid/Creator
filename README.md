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
  - **Pecah jadi konten lain (repurposing)** — tempel naskah/transkrip aslinya,
    lalu ubah satu konten jadi beberapa versi untuk platform atau format lain.
    Tiap turunan bisa langsung disimpan ke papan, dan tetap tertaut ke konten asalnya.
- **Tema terang & gelap.**
- **Landing page & billing** — halaman publik `/` buat promosi, plan Gratis/Pro/Studio,
  dan pembayaran lewat [lynk.id](https://lynk.id) atau transfer manual.

## Yang belum ada

Aplikasi ini **tidak memposting otomatis** ke Instagram/TikTok/YouTube. Auto-posting
butuh akses API resmi tiap platform (akun Business + review aplikasi dari Meta,
approval TikTok Content Posting API, dan seterusnya). Yang tersedia di sini adalah
perencanaan, penjadwalan, pengingat, dan pencatatan hasil.

## Deploy ke Vercel

1. Buka [vercel.com](https://vercel.com), login pakai GitHub, import repo ini.
2. Di tab **Storage** project, buat database **Postgres** (Neon) dan connect ke
   project. Ini otomatis mengisi beberapa environment variable.
3. Tambahin satu env variable manual: `DIRECT_URL`, isinya connection string
   yang **non-pooled**. Neon/Vercel biasanya bikin variabel terpisah buat ini —
   cari di halaman Environment Variables yang namanya mengandung `UNPOOLED`
   atau `NON_POOLING` dan isinya berupa connection string lengkap (`postgresql://...`),
   lalu salin nilainya. Tanpa ini, `prisma migrate deploy` gagal dengan error
   P1002 (timeout) karena migrasi butuh koneksi langsung, bukan lewat pooler.
4. Deploy. Migrasi database jalan otomatis lewat script `vercel-build`.

Kunci sesi dan VAPID key untuk push notification dibuat otomatis saat pertama
kali dipakai dan disimpan di database.

Untuk mengaktifkan fitur AI, tambahkan `AI_GATEWAY_API_KEY` di environment
variable project Vercel — kuncinya ada di tab **AI Gateway** project yang sama.
Lewat gateway itu satu kunci bisa memanggil Gemini, Claude, dan model lain, dan
ada kredit gratis tiap bulan. Model default-nya Gemini Flash (murah); untuk naik
kelas, set `AI_MODEL="anthropic/claude-sonnet-5"` tanpa mengubah kode.

Alternatifnya, `ANTHROPIC_API_KEY` juga masih didukung untuk memanggil Anthropic
langsung. Tanpa salah satu kunci itu aplikasi tetap berjalan normal — tab AI
hanya menampilkan petunjuk cara mengaktifkannya.

Pemakaian AI ditagih per penggunaan ke akun pemilik kunci, jadi perhitungkan
biayanya kalau aplikasi ini dipakai banyak orang — isi `MANUAL_PAYMENT_GOPAY_NUMBER`
atau `LYNK_PRO_URL` (lihat tabel di bawah) supaya pemakaian AI dibatasi kuota
per plan dan biayanya tertutup dari langganan.

### Catatan performa

`vercel.json` menyetel region function ke `sin1` (Singapura). Untuk hasil terbaik,
buat database Neon di region yang sama supaya query tidak menyeberang benua.

### Environment variable opsional

| Variabel | Fungsi |
| --- | --- |
| `AI_GATEWAY_API_KEY` | Mengaktifkan seluruh fitur AI lewat [Vercel AI Gateway](https://vercel.com/docs/ai-gateway) — satu kunci untuk Gemini, Claude, dsb. Tanpa ini (dan tanpa `ANTHROPIC_API_KEY`), tab AI menampilkan petunjuk setup dan fitur lain tetap jalan. |
| `ANTHROPIC_API_KEY` | Alternatif: memanggil Anthropic langsung tanpa gateway. Dipakai kalau `AI_GATEWAY_API_KEY` kosong. |
| `AI_MODEL` | Ganti model tanpa ubah kode. Default `google/gemini-2.5-flash` (lewat gateway) atau `claude-sonnet-5` (langsung ke Anthropic). |
| `CRON_SECRET` | Kalau diisi, endpoint `/api/cron/reminders` hanya menerima request dengan header `Authorization: Bearer <nilai>`. |
| `LYNK_PRO_URL`, `LYNK_STUDIO_URL` | Link checkout produk di [lynk.id](https://lynk.id) untuk tiap plan berbayar. Tanpa ini, kuota AI tidak dibatasi dan tombol upgrade disembunyikan. |
| `LYNK_WEBHOOK_TOKEN` | Token rahasia buatan sendiri, dipasang di URL webhook lynk.id (`/api/billing/webhook/lynk?token=...`) supaya endpoint itu cuma menerima notifikasi asli. |
| `MANUAL_PAYMENT_GOPAY_NUMBER` | Nomor GoPay yang ditampilkan di halaman Billing buat transfer manual. Berguna sebelum akun lynk.id kelar diverifikasi, dan sebagai cadangan kalau ada pembayaran yang gagal dicocokkan otomatis. |
| `ADMIN_EMAIL` | Wajib diisi kalau pakai pembayaran manual — email akun yang boleh buka `/admin/orders` buat konfirmasi pembayaran masuk secara manual. |

### Cara menyiapkan pembayaran lynk.id

1. Buat satu produk per plan berbayar di dashboard lynk.id (Pro dan Studio),
   dengan harga yang sama seperti di `PLAN_PRICE` (`src/lib/billing.ts`).
2. Salin link checkout tiap produk ke `LYNK_PRO_URL` dan `LYNK_STUDIO_URL`.
3. Buat token acak sendiri, isi ke `LYNK_WEBHOOK_TOKEN`, lalu daftarkan
   `https://domainmu/api/billing/webhook/lynk?token=<token itu>` sebagai URL
   webhook di dashboard lynk.id.

Alurnya: pembeli diarahkan ke link lynk.id, dan begitu pembayarannya masuk,
webhook mencocokkan email pembeli dengan akun yang punya order pending, lalu
mengaktifkan plannya.

**Catatan:** dokumentasi lynk.id memblokir automated fetching, jadi nama field
persis di payload webhook belum pernah diverifikasi ke sistem aslinya.
`applyLynkWebhookPayload` karena itu sengaja dibuat toleran — ia mencari email
dan status pembayaran dari beberapa kemungkinan nama field, di kedalaman berapa
pun. Kalau tetap tidak cocok, ordernya **dibiarkan pending** (bukan diaktifkan)
dan bisa dikonfirmasi manual lewat `/admin/orders`. Jadi payload yang tak
dikenali tidak akan pernah membagikan plan berbayar secara keliru. Setelah
transaksi pertama, cek log webhooknya dan sesuaikan `EMAIL_KEYS`/`STATUS_KEYS`
di `src/lib/billing.ts` kalau perlu.

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
