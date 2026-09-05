import { LegalPage } from "@/components/LegalPage";

export const metadata = { title: "Syarat Penggunaan · Creator Studio" };

export default function TermsPage() {
  return (
    <LegalPage title="Syarat Penggunaan" updated="5 September 2026">
      <section>
        <h2>Layanan</h2>
        <p>
          Creator Studio membantu perencanaan, pencatatan, analisis, dan pembuatan bahan
          konten. Aplikasi tidak memposting otomatis ke media sosial dan tidak menjamin
          jumlah view, engagement, penjualan, atau hasil bisnis tertentu.
        </p>
      </section>
      <section>
        <h2>Akun dan penggunaan</h2>
        <ul>
          <li>Kamu bertanggung jawab menjaga password dan aktivitas akunmu.</li>
          <li>Dilarang menyalahgunakan layanan, mencoba menembus sistem, atau memakai AI untuk hal ilegal.</li>
          <li>Kamu tetap bertanggung jawab memeriksa akurasi dan hak penggunaan output AI sebelum dipublikasikan.</li>
        </ul>
      </section>
      <section>
        <h2>Plan Pro dan pembayaran</h2>
        <p>
          Plan Pro berlaku 30 hari per aktivasi dan tidak diperpanjang otomatis. Pembayaran
          dilakukan di OrderHero, lalu pelanggan mengonfirmasi nomor order dan email akun
          melalui WhatsApp. Aktivasi dilakukan setelah pembayaran berhasil diverifikasi. Setelah
          masa aktif berakhir, akun kembali ke Gratis dan data konten tetap tersimpan.
        </p>
      </section>
      <section>
        <h2>Kuota dan ketersediaan</h2>
        <p>
          Setiap aksi AI mengurangi kuota plan. Gangguan penyedia model, hosting, internet,
          atau maintenance dapat membuat layanan sementara tidak tersedia. Kami dapat
          membatasi request yang berlebihan untuk melindungi seluruh pengguna.
        </p>
      </section>
      <section>
        <h2>Pembatalan dan pengembalian dana</h2>
        <p>
          Karena akses digital diberikan setelah aktivasi, pembayaran yang sudah aktif pada
          dasarnya tidak dapat dibatalkan. Kalau terjadi pembayaran ganda, akun tidak aktif,
          atau gangguan teknis yang membuat layanan utama tidak dapat digunakan, hubungi kami
          agar kasusnya diperiksa dan diselesaikan secara wajar.
        </p>
      </section>
      <section>
        <h2>Kontak</h2>
        <p>
          Bantuan pembayaran atau akun tersedia melalui{" "}
          <a href="https://wa.me/62895323408858" target="_blank" rel="noopener noreferrer">
            WhatsApp Creator Studio
          </a>.
        </p>
      </section>
    </LegalPage>
  );
}
