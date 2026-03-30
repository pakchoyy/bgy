# Aplikasi Generator Soal

Aplikasi web untuk membuat soal latihan sekaligus ekspor dokumen siap pakai.

## Fitur Utama

- Generate soal berdasarkan:
  - Nama sekolah
  - Judul ujian
  - Tahun pelajaran
  - Mata pelajaran
  - Topik
  - Tingkat kesulitan
  - Tipe soal (Pilihan Ganda / Essay)
  - Jumlah soal
- Kunci jawaban pilihan ganda otomatis dan konsisten dengan opsi benar
- Preview lembar ujian gaya dokumen sekolah
- Ekspor ke DOCX (editable)
- Ekspor ke PDF (siap cetak)
- Tombol salin hasil

## Cara Menjalankan

1. Buka `index.html` di browser.
2. Isi form lalu klik `Generate Soal`.
3. Pilih:
   - `DOCX` untuk dokumen yang bisa diedit di Word
   - `PDF` untuk cetak/distribusi

Catatan: aplikasi memakai CDN (`docx`, `FileSaver`, `html2pdf`) jadi perlu internet saat pertama kali memuat library.

## Struktur File

- `index.html` antarmuka aplikasi
- `style.css` styling web + print layout
- `app.js` logika generator + export DOCX/PDF
