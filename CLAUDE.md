# Bantu Guru Yuk (BGY)

Setiap membuat atau mengubah tampilan tool/halaman BGY, **ikuti `DESIGN-BGY.md`** (warna, header "BGY | Nama Tool", menu hamburger dengan `data-bgy-menu`, ikon Lucide tanpa emoji di UI, bar Info dari `/bgy-info.js`, ukuran minimum teks 12px & sentuh 40px, footer, mode gelap, PWA/install, komponen jualan, keamanan, dan checklist aplikasi baru).

Untuk tool berbayar (batas gratis, aktivasi, Lynk, Supabase, promo), **ikuti `PRO-LISENSI.md`**.

## Cara kerja
- Hosting Vercel (static + `/api/*`), Cloudflare untuk domain. Header HTTP di `vercel.json`.
- Setelah perubahan selesai dan dites: commit, push ke branch kerja, lalu ke `main` supaya web langsung ter-update.
- Tes tampilan di lebar HP 390px (Playwright/Chromium tersedia). Naikkan nama cache SW tool yang diubah.
- Bank TP Draft TP: tiap TP maksimal 100 karakter (batas e-Rapor).
- Jawab pemilik (Pak Choy) singkat, jelas, bahasa Indonesia santai.
