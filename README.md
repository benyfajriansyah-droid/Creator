# Creator Studio

Aplikasi manajemen konten untuk content creator: kelola ide, jadwal, kalender konten, dan lihat performa mana yang worth it.

## Fitur

- **Konten** — catat ide, jadwal tayang, dan status (ide / terjadwal / tayang) untuk tiap konten.
- **Kalender** — lihat semua konten terjadwal/tayang dalam tampilan kalender bulanan.
- **Performa manual** — input views, likes, comments, shares, saves, jam pengerjaan, dan revenue setelah konten tayang.
- **Worth It score** — setiap konten yang sudah tayang otomatis dibandingkan engagement rate-nya dengan rata-rata, lalu diberi label Worth It / Rata-rata / Kurang Worth It.

## Menjalankan secara lokal

1. Install dependencies:
   ```bash
   npm install
   ```
2. Buat file `.env` di root project (lihat `.env.example`) dan isi `DATABASE_URL`, misalnya:
   ```
   DATABASE_URL="file:./prisma/dev.db"
   ```
3. Jalankan migrasi database:
   ```bash
   npx prisma migrate dev
   ```
4. Jalankan development server:
   ```bash
   npm run dev
   ```
5. Buka [http://localhost:3000](http://localhost:3000).

## Stack

- [Next.js](https://nextjs.org) (App Router) + TypeScript
- [Tailwind CSS](https://tailwindcss.com)
- [Prisma](https://www.prisma.io) + SQLite
