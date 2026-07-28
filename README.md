# Creator Studio

Aplikasi manajemen konten untuk content creator: kelola ide, jadwal, kalender konten, dan lihat performa mana yang worth it.

## Fitur

- **Konten** — catat ide, jadwal tayang, dan status (ide / terjadwal / tayang) untuk tiap konten.
- **Kalender** — lihat semua konten terjadwal/tayang dalam tampilan kalender bulanan.
- **Performa manual** — input views, likes, comments, shares, saves, jam pengerjaan, dan revenue setelah konten tayang.
- **Worth It score** — setiap konten yang sudah tayang otomatis dibandingkan engagement rate-nya dengan rata-rata, lalu diberi label Worth It / Rata-rata / Kurang Worth It.

## Deploy ke Vercel

1. Buka [vercel.com](https://vercel.com), login pakai akun GitHub.
2. "Add New" → "Project" → import repo ini.
3. Sebelum/sesudah import, buka tab **Storage** di project Vercel-nya → "Create Database" → pilih **Postgres** (Neon) → connect ke project ini. Ini otomatis mengisi environment variable `DATABASE_URL`.
4. Deploy. Migrasi database jalan otomatis lewat script `vercel-build`.
5. Selesai — aplikasinya bisa diakses lewat link `*.vercel.app` dari device mana aja.

## Menjalankan secara lokal

1. Install dependencies:
   ```bash
   npm install
   ```
2. Buat file `.env` di root project (lihat `.env.example`) dan isi `DATABASE_URL` dengan connection string Postgres (bisa pakai database Vercel/Neon yang sama, atau bikin database Postgres gratis sendiri, misalnya di [neon.com](https://neon.com)).
3. Jalankan migrasi database:
   ```bash
   npx prisma migrate deploy
   ```
4. Jalankan development server:
   ```bash
   npm run dev
   ```
5. Buka [http://localhost:3000](http://localhost:3000).

## Stack

- [Next.js](https://nextjs.org) (App Router) + TypeScript
- [Tailwind CSS](https://tailwindcss.com)
- [Prisma](https://www.prisma.io) + Postgres
