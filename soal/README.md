# Aplikasi Generator Soal

Aplikasi web untuk membuat soal latihan sekaligus ekspor dokumen siap pakai.

## Fitur Utama

- Generate soal berdasarkan:
  - Nama sekolah
  - Judul ujian
  - Tahun pelajaran
  - Jenjang dan kelas
  - Mata pelajaran
  - Materi pilihan atau materi ketik manual
  - Tingkat kesulitan Bloom C1-C6
  - Jumlah soal PG, isian singkat, dan uraian
- Jumlah opsi PG otomatis berdasarkan kelas:
  - Kelas 1-3: A, B, C
  - Kelas 4-9: A, B, C, D
  - Kelas 10-12: A, B, C, D, E
- Validasi hasil AI sebelum ditampilkan:
  - jumlah soal sesuai input
  - jumlah opsi PG sesuai kelas
  - jawaban PG sesuai opsi yang tersedia
  - level Bloom sesuai pilihan
- Kunci jawaban otomatis
- Kisi-kisi otomatis
- Preview lembar ujian gaya dokumen sekolah
- Ekspor ke DOCX (editable)
- Ekspor ke PDF (siap cetak)
- Tombol salin hasil
- Histori soal di browser
- Mode Pro dan limit harian

## Cara Menjalankan

1. Buka `index.html` di browser, atau akses folder `/soal/` saat sudah dideploy.
2. Isi form lalu klik `Generate Soal`.
3. Pilih:
   - `DOCX` untuk dokumen yang bisa diedit di Word
   - `PDF` untuk cetak/distribusi

Catatan:

- Aplikasi memakai CDN (`docx`, `html2canvas`, `jsPDF`, Supabase) jadi perlu internet saat pertama kali memuat library.
- Generate soal memakai endpoint `/api/generate-soal` dan membutuhkan environment variable `GEMINI_SOAL_1` sampai `GEMINI_SOAL_6`.
- Model Gemini default adalah `gemini-3.6-flash`. Bisa diganti dengan environment variable `GEMINI_SOAL_MODEL`.

## Struktur File

- `index.html` antarmuka aplikasi
- `sw.js` service worker untuk cache aset statis
- `manifest.json` konfigurasi PWA
- `guru-cibisd2.png` ikon aplikasi
- `../api/generate-soal.js` endpoint serverless untuk Gemini
