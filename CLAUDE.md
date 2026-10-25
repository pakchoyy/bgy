# Bantu Guru Yuk (BGY)

Setiap membuat atau mengubah tampilan tool/halaman BGY, **ikuti `DESIGN-BGY.md`** (warna, header "BGY | Nama Tool", menu hamburger dengan `data-bgy-menu`, ikon Lucide tanpa emoji di UI, bar Info dari `/bgy-info.js`, ukuran minimum teks 12px & sentuh 40px, footer, mode gelap, PWA/install, komponen jualan, keamanan, dan checklist aplikasi baru).

Untuk tool berbayar (batas gratis, aktivasi, Lynk, Supabase, promo), **ikuti `PRO-LISENSI.md`**.

## Cara kerja
- Hosting Vercel (static + `/api/*`), Cloudflare untuk domain. Header HTTP di `vercel.json`.
- Setelah perubahan selesai dan dites: commit, push ke branch kerja, lalu ke `main` supaya web langsung ter-update.
- Tes tampilan di lebar HP 360px dan 390px, juga mode gelap (Playwright/Chromium tersedia). Naikkan nama cache SW tool yang diubah.
- Perubahan database: tulis file di `supabase/migrations/` beserta rollback; Pak Choy yang menjalankan di Supabase BGY.

## Hemat deploy Vercel
- Kuota deploy (Hobby) 100 per hari, dipakai bersama project Presensi Siswa, Guru, dan Store.
- Hanya `main` yang di-build (`ignoreCommand` di `vercel.json`). Branch kerja boleh di-push kapan saja.
- Gabungkan perubahan jadi satu push ke `main`. Jangan push ke `main` per commit kecil; perbaikan teks/rapi-rapi ikut push berikutnya kecuali mendesak.
- Jangan memicu deploy ulang tanpa kebutuhan (commit kosong, redeploy berulang). Redeploy manual hanya bila push ke `main` terbukti tidak memicu deploy.
- Bank TP Draft TP: tiap TP maksimal 100 karakter (batas e-Rapor).
- Jawab pemilik (Pak Choy) singkat, jelas, bahasa Indonesia santai.
