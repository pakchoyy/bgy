# Bantu Guru Yuk (BGY)

Platform web dan PWA produktivitas guru Indonesia berbasis Kurikulum Merdeka. Menyediakan generator perangkat pembelajaran otomatis, pengolah nilai, penyusun soal, serta bank dokumen administrasi guru yang siap pakai dan terintegrasi dengan e-Rapor.

---

## 1. Arsitektur & Topologi Proyek

- **Hosting & Deployment**: Vercel (static web hosting + serverless endpoints `/api/*`) dengan konfigurasi routing di `vercel.json`.
- **Domain & CDN**: Cloudflare DNS.
- **Frontend Stack**: Vanilla HTML5, CSS3, JavaScript modern (ES6+), Font Plus Jakarta Sans, SVG Lucide Icons (tanpa emoji pada antarmuka).
- **Backend & Database**: Supabase (PostgreSQL, Auth, RLS, Storage) untuk data lisensi Pro, analitik penggunaan, dan dokumen.
- **Offline / PWA**: Service Worker per-aplikasi dengan strategi cache *network-first* untuk pembaruan instan.
- **Desain & Standar UI**: Mengikuti panduan `DESIGN-BGY.md` (mobile viewport 390px, responsif desktop, header `BGY | Nama Tool`, navigasi `bgy-info.js`).

### Struktur Direktori

```text
bgy/
├── admin/                  # Panel admin analitik, statistik pengguna, & lisensi
├── api/                    # Vercel Serverless Functions (AI generator, auth, data)
│   ├── generate-modul-ajar.js
│   ├── generate-soal.js
│   ├── generate-teks.js
│   ├── generate-image.js
│   └── modul-access.js
├── bgy-info.js             # Shared navigation bar, dialog info, & sistem notifikasi
├── dokumen/                # Tool Dokumen Resmi & administrasi guru
├── draft-tp/               # Tool Draft Tujuan Pembelajaran (TP) & ATP/Prota/Prosem
├── katrol-nilai/           # Pengolah dan penyesuai nilai rapor siswa
├── kokurikuler/            # Generator modul kokurikuler (P5 / PPA)
├── lkpd/                   # Generator Lembar Kerja Peserta Didik (LKPD)
├── modul-ajar/             # Generator Modul Ajar lengkap dengan asesmen
├── sandi/                  # Pengelola akun & kata sandi sekolah (PWA mandiri)
├── soal/                   # Generator naskah soal asesmen & kisi-kisi
├── teks-sekolah/           # Penyusun naskah sambutan, pidato, & surat resmi sekolah
├── supabase/migrations/    # Migrasi database Supabase
└── sw.js                   # Root Service Worker
```

---

## 2. Inventaris Fitur Aktif

### Draft TP (`/draft-tp`)
- **Bank Data CP Tersinkronisasi**:
  - `cp2025`: Capaian Pembelajaran BSKAP 046/2025 (PAUD/TK, SD Kelas 1–6, SMP Kelas 7–9, SMA Kelas 10–12).
  - `cp2026`: Capaian Pembelajaran BKPDM No. 020 Tahun 2026 (Pendidikan Agama Islam, Kristen, Katolik, Hindu, Buddha, Khonghucu).
- **Standar e-Rapor Mutlak**:
  - Seluruh TP dijamin **maksimal 100 karakter** agar muat pada aplikasi e-Rapor resmi Kemendikdasmen.
  - Rumusan TP lengkap, mandiri, memiliki KKO operasional, dan bebas dari fragmen/potongan kata menggantung.
- **ATP, Rincian Minggu Efektif, Prota & Prosem**:
  - Dihitung langsung di sisi klien (`draft-tp/perangkat.js`) berbasis kalender pendidikan dan alokasi JP.
  - Ekspor hasil ke Cetak/PDF, dokumen Word, dan Excel.

### Modul Ajar (`/modul-ajar`)
- Generator modul ajar Kurikulum Merdeka terstruktur: Identitas, Pemahaman Bermakna, Pertanyaan Pemantik, Kegiatan Inti (Berdiferensiasi), Asesmen Formatif/Sumatif, dan LKPD.
- Dukungan model AI Google Gemini dengan failover multi-kunci.

### Buat Soal (`/soal`)
- Penyusunan paket soal pilihan ganda, isian, dan uraian lengkap dengan kunci jawaban dan pembahasan.

### LKPD (`/lkpd`)
- Pembuatan lembar aktivitas belajar interaktif per mata pelajaran dan topik bahasan.

### Sandi (`/sandi`)
- Aplikasi PWA penyimpanan dan pencadangan kredensial akun guru, siswa, dan sekolah secara terenkripsi lokal.

### Katrol Nilai (`/katrol-nilai`)
- Simulasi dan penyesuaian distribusi nilai harian/ujian dengan metode batas rentang linear.

---

## 3. Menjalankan Proyek Secara Lokal

Proyek bersifat *static front-end* dengan serverless backend Vercel:

```bash
# Menggunakan Vercel CLI (rekomendasi untuk menguji serverless /api)
vercel dev

# Atau menggunakan server statis lokal apa pun
npx serve .
```

---

## 4. Lisensi & Hak Cipta

© 2026 Bantu Guru Yuk (BGY) by Pak Choyy. Seluruh hak cipta dilindungi undang-undang.
