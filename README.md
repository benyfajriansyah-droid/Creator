# Creator Studio

Aplikasi manajemen konten untuk content creator: rencanakan, jadwalkan, dan ukur
performa konten dari beberapa akun sosmed dalam satu tempat.

## Fitur

- **Login** — data konten terkunci per akun pengguna, dengan reset password
  lewat tautan sekali pakai yang berlaku 1 jam.
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
  - **Analisa otomatis** — begitu konten tayang dan angka performanya diisi, AI
    langsung menulis evaluasinya sendiri: apa yang jalan, apa yang perlu diubah,
    dan satu langkah berikutnya. Tersimpan di kontennya, jadi tidak dibuat ulang
    setiap halaman dibuka.
  - **Pecah jadi konten lain (repurposing)** — tempel naskah/transkrip aslinya,
    lalu ubah satu konten jadi beberapa versi untuk platform atau format lain.
    Tiap turunan bisa langsung disimpan ke papan, dan tetap tertaut ke konten asalnya.
- **Tema terang & gelap.**
- **Landing page & billing** — halaman publik `/` buat promosi, plan Gratis dan Pro,
  dengan pembayaran lewat [lynk.id](https://lynk.id).

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
biayanya kalau aplikasi ini dipakai banyak orang — isi `ADMIN_EMAIL` (lihat tabel
di bawah) supaya pemakaian AI dibatasi kuota per plan dan biayanya tertutup dari
langganan.

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
| `RESEND_API_KEY` | Mengaktifkan pengiriman email untuk reset password lewat [Resend](https://resend.com). Tanpa ini alur resetnya tetap ada, tapi tautannya dibuat manual oleh admin di `/admin/plans`. |
| `EMAIL_FROM` | Alamat pengirim email. Default memakai alamat bersama milik Resend yang cukup untuk uji coba. |
| `ADMIN_EMAIL` | Email akun yang boleh buka `/admin/plans` untuk mengaktifkan plan pelanggan. Selama kosong, kuota AI tidak dibatasi sama sekali — karena tanpa admin tidak ada yang bisa mengaktifkan siapa pun, jadi membatasi malah mengunci semua akun tanpa jalan keluar. |

### Cara kerja pembayaran

Pembayaran ditangani sepenuhnya oleh [lynk.id](https://lynk.id) — aplikasi ini
tidak pernah memproses uang dan tidak diberi tahu saat ada yang membayar. Karena
itu alurnya:

1. Calon pelanggan klik **Langganan Pro** di landing page atau halaman Billing,
   lalu membayar di halaman checkout lynk.id.
2. Dia mengabari kamu, menyertakan email yang dipakai mendaftar di aplikasi ini.
3. Kamu buka `/admin/plans`, masukkan email itu, klik **Aktifkan Pro**. Plannya
   langsung aktif 30 hari dan kuota AI-nya di-reset.

Langganan tidak diperpanjang otomatis: setelah 30 hari plannya lewat masa aktif
dan pelanggan perlu membayar lagi, lalu diaktifkan ulang dengan cara yang sama.
Halaman `/admin/plans` menampilkan siapa saja yang aktif beserta tanggal
habisnya, jadi perpanjangan bisa dipantau dari situ.

Link checkoutnya ada di `LYNK_CHECKOUT_URL` (`src/lib/billing.ts`) — bukan
environment variable, karena itu tautan publik biasa. Ganti di situ kalau
produknya dibuat ulang di lynk.id.

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
