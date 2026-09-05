import { LegalPage } from "@/components/LegalPage";

export const metadata = { title: "Kebijakan Privasi · Creator Studio" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Kebijakan Privasi" updated="5 September 2026">
      <section>
        <h2>Data yang kami simpan</h2>
        <p>
          Creator Studio menyimpan nama, email, password yang sudah di-hash, pengaturan,
          data konten dan performa yang kamu masukkan, percakapan AI, langganan, serta
          informasi teknis yang dibutuhkan untuk notifikasi dan keamanan akun.
        </p>
      </section>
      <section>
        <h2>Cara data digunakan</h2>
        <p>
          Data dipakai untuk menjalankan fitur aplikasi, menjaga keamanan, menghitung
          kuota, memberi insight, memproses bantuan pelanggan, dan meningkatkan layanan.
          Kami tidak menjual data pribadimu.
        </p>
      </section>
      <section>
        <h2>Layanan pihak ketiga</h2>
        <p>Untuk menjalankan layanan, sebagian data dapat diproses oleh:</p>
        <ul>
          <li>Vercel dan Neon untuk hosting aplikasi serta database.</li>
          <li>Penyedia model AI untuk memproses prompt dan konteks yang kamu kirim.</li>
          <li>Resend untuk email reset password, jika fitur email aktif.</li>
          <li>OrderHero untuk pembayaran; kebijakan OrderHero berlaku di halaman mereka.</li>
        </ul>
      </section>
      <section>
        <h2>Keamanan dan penyimpanan</h2>
        <p>
          Kami menerapkan pembatasan request, pemisahan data per akun, cookie sesi aman,
          dan password ter-hash. Tidak ada sistem yang sepenuhnya bebas risiko. Data
          disimpan selama akunmu aktif atau selama diperlukan untuk kewajiban operasional.
        </p>
      </section>
      <section>
        <h2>Hak kamu</h2>
        <p>
          Kamu bisa mengekspor data atau menghapus akun dari halaman Pengaturan. Penghapusan
          akun menghapus data aplikasi secara permanen, kecuali catatan minimal yang wajib
          dipertahankan berdasarkan hukum atau kebutuhan penyelesaian transaksi.
        </p>
      </section>
      <section>
        <h2>Kontak</h2>
        <p>
          Pertanyaan privasi bisa dikirim melalui{" "}
          <a href="https://wa.me/62895323408858" target="_blank" rel="noopener noreferrer">
            WhatsApp Creator Studio
          </a>.
        </p>
      </section>
    </LegalPage>
  );
}
