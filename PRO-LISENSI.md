# Sistem Pro & Lisensi Bantu Guru Yuk (BGY)

Acuan untuk semua tool berbayar BGY dan web baru yang ingin memakai pola yang sama. Desain tampilan tetap mengikuti `DESIGN-BGY.md` (bagian 14 & 15).

---

## 1. Ringkasan model bisnis

- **Freemium**: tool bisa dipakai gratis dengan **batas harian**; Pro = tanpa batas + fitur tambahan.
- Pembayaran di **Lynk** (`lynk.id/kreacy`). Setelah bayar, Lynk mengarahkan pembeli ke halaman aktivasi.
- Paket:
  - `lifetime` — pembeli lama, aktif selamanya (`active_until` kosong).
  - `annual` — pembeli baru, aktif **1 tahun** sejak aktivasi.

## 2. Daftar produk

| Tool | Gratis | Pro | Link Lynk | Halaman aktivasi | `access` / penyimpanan |
|---|---|---|---|---|---|
| Buat Soal (`/soal/`) | `DAILY_LIMIT = 1`×/hari | Tanpa batas, PDF & Word | `https://lynk.id/kreacy/mplxqygkqj36` | `/aktvs-bs.html` | Supabase `soal` · localStorage `bgy_pro` |
| Modul Ajar (`/modul-ajar/`) | `DAILY_LIMIT = 1`×/hari | Tanpa batas, salin & buka AI sekali klik | `https://lynk.id/kreacy/y8eol1jk91g6` | `/aktvs-ma.html` | Supabase `modul_ajar` · `bgy_pro_ma` |
| Kokurikuler (`/kokurikuler/`) | `DAILY_LIMIT = 1`×/hari | Tanpa batas, salin prompt & buka AI | `https://lynk.id/kreacy/y8eol1jk91g6` | `/aktvs-kkrklr.html` | Supabase `kokurikuler` · `bgy_pro_modul` |
| Prompt LKPD (`/lkpd/`) | `FREE_LIMIT = 2`×/hari, riwayat 5 | Tanpa batas, riwayat 50 | `https://lynk.id/kreacy/nq35v4y36gz8` | `/aktvs-lkpd.html` (pembeli baru) | Supabase `lkpd` (langganan 1 tahun) · `bgy_pro_lkpd_sub`; pembeli lama: Cloudflare Worker (lifetime) · `bgy_pro_lkpd` |

**Aturan:** teks batas di halaman/Beranda harus memakai konstanta (`DAILY_LIMIT`, `FREE_LIMIT`), jangan angka ketik manual. Kunci localStorage **harus unik per tool** (semua tool satu domain, jadi kunci yang sama akan saling menimpa).

## 3. Alur aktivasi (Soal, Modul Ajar, Kokurikuler)

```
Beli di Kreacy ──► link produk: /aktvs-xx.html?order={order}&sig={sig}
                   (toko mengganti {order} + {sig} = HMAC-SHA256(KLAIM_HMAC_SECRET, order))
                 └─ isi email → RPC bgy_claim_order(order, sig, email, access)
                    → cek tanda tangan; satu pesanan = satu email (tabel bgy_order_claims)
                    → is_pro=true, annual, active_until = max(sekarang, sisa lama) + 1 tahun
                    → keluar kode BGY-XXXXX (link dibuka lagi dgn email sama = kode sama)
Buka tool ──► tab "Kode Aktivasi": email + kode → RPC bgy_activate_pro(email, code, access)
              → status disimpan di localStorage tool
Ganti HP / hapus data ──► tab "Login Email": RPC bgy_subscription_status(email, access)
```

- Status Pro dianggap aktif bila `is_pro = true` **dan** (`plan_type` bukan `annual` **atau** `active_until` masih di masa depan).
- **Perpanjangan** otomatis: beli lagi di Kreacy → klaim dengan email yang sama → +1 tahun. Manual lewat SQL bila perlu:
  ```sql
  update public.users
  set active_until = greatest(active_until, now()) + interval '1 year'
  where lower(email) = lower('guru@contoh.com') and access = 'soal';
  ```

### LKPD (dua jalur)
- **Pembeli baru** (sejak migrasi `20261018_lkpd_access.sql`): sama seperti Buat Soal / Modul Ajar. Halaman `/aktvs-lkpd.html` → kode `BGY-XXXXX` → di `/lkpd/` isi email + kode (`bgy_activate_pro`, `access='lkpd'`). **Langganan 1 tahun** (`plan_type='annual'`). Ganti perangkat: "Sudah beli? Masuk dengan email" (`bgy_subscription_status`). Status disimpan di `bgy_pro_lkpd_sub` dan disegarkan ke server tiap halaman dibuka.
- **Pembeli lama:** kode 4 angka (`BGY-7392`) tetap divalidasi Cloudflare Worker (`PRO_CODES`, kode di `lkpd/worker.js`) lewat `/api/lkpd-validate` (proxy, cadangan langsung ke `bgypro.pulsachoy.workers.dev`). Hasilnya `bgy_pro_lkpd = "1"` = **lifetime**, tidak pernah kedaluwarsa dan tidak dicek ulang. Jangan hapus Worker / env `PRO_CODES` selama masih ada pembeli lama yang belum aktivasi.
- Di Kreacy, link file produk LKPD: `https://www.bantuguruyuk.web.id/aktvs-lkpd.html?order={order}&sig={sig}`.
- Percobaan kode lama dibatasi di server: `bgy_ai_gate('lkpd_code')` 5/menit, 20/hari per IP.

## 4. Database Supabase

Proyek: `xtmpiqpmwirsrcsphsto.supabase.co` (anon key boleh di browser, service role key **tidak pernah**).

| Tabel / fungsi | Isi | Akses |
|---|---|---|
| `users` | `email, code, access, is_pro, plan_type, active_until, purchased_at` | RLS aktif, anon **tidak bisa** baca/tulis langsung |
| `bgy_claim_order(p_order, p_sig, p_email, p_access)` | klaim pesanan Kreacy → Pro 1 tahun + kode | anon (RPC) |
| `bgy_order_claims` | pesanan yang sudah diklaim (order_id unik) | baca hanya admin |
| `bgy_private` (key `klaim_hmac_secret`) | rahasia HMAC, sama dengan env toko `KLAIM_HMAC_SECRET` | tidak bisa dibaca dari luar |
| `bgy_request_activation_code` | **ditutup** (migrasi `20261025_keamanan_klaim.sql`) | tidak ada |
| `bgy_activate_pro(p_email, p_code, p_access)` | aktifkan annual sekali | anon (RPC) |
| `bgy_subscription_status(p_email, p_access)` | cek status untuk login email | anon (RPC) |
| `bgy_admins` + `bgy_is_admin()` | daftar email admin (harus email terverifikasi) | hanya lewat fungsi |
| `bgy_reviews` + `bgy_submit_review()` + `bgy_review_stats()` | ulasan pengguna | baca publik (yang disetujui), tulis lewat RPC |
| `bgy_bio_links` + `bgy_bio_click()` | link di `/k` | baca publik, tulis admin |
| `bgy_settings` (key `promo`, `lisensi`) | promo, voucher, bundling, garansi, pengumuman | baca publik, tulis admin |
| `bgy_settings` (key `admin_*`) | data dashboard admin (proyek, sandi, langganan) | **hanya admin** |
| `bgy_docs` + `bgy_doc_download()` + Storage bucket `dokumen` | Dokumen Resmi (`/dokumen`): judul, nomor, tahun, kategori, sumber, ringkasan, file (maks 50 MB) atau link | baca publik (yang aktif), tulis & unggah admin |
| `bgy_events` + `bgy_track()` + `bgy_usage_stats()` | statistik pemakaian anonim (ID acak per browser): open, hasil, pro, install, share | tulis lewat RPC (maks 300/hari per browser), ringkasan hanya admin |

File migrasi di `supabase/migrations/` — jalankan berurutan di Supabase → SQL Editor. Semua aman dijalankan ulang.

## 5. Admin (`/admin`)

Login pakai **kode dari email** (Supabase Auth OTP, `shouldCreateUser:false`), atau klik link di email itu. Bisa juga dibuka dengan ketuk judul header 5× di halaman mana saja (hanya jalan pintas; pengamannya tetap `bgy_is_admin()` di server). Email harus ada di `bgy_admins`:
```sql
insert into public.bgy_admins (email) values ('email-kamu@contoh.com') on conflict do nothing;
```
Tab: **Link Bio** (`/k`), **Ulasan** (tampil/sembunyikan/edit/hapus), **Promo**, **Dokumen** (tambah/edit dokumen resmi + upload file), **Statistik** (guru unik hari ini/7/30 hari, grafik harian, tabel per tool; dicatat otomatis oleh `bgy-info.js`).

**Tab Promo** (tampil otomatis di kartu tawaran Pro & dekat tombol Beli semua tool berbayar):
| Kolom | Contoh | Catatan |
|---|---|---|
| Tampilkan promo + teks | `Diskon 30% menjelang ASAS` | wajib diisi bila promo dinyalakan |
| Berlaku sampai | `2026-12-10` | otomatis hilang setelah tanggal ini |
| Link promo | `https://lynk.id/...` | opsional, wajib `https://` |
| Kode voucher + keterangan | `TEMANGURU` · `diskon 10%` | juga ikut di pesan "Bagikan ke teman guru" |
| Paket bundling | `Paket Guru Pro (semua tool)` + link | |
| Garansi | `Garansi uang kembali 3 hari` | tulis hanya bila benar-benar diberikan |
| Pengumuman + jenis | `Server maintenance Sabtu malam` · info/penting | tampil sekali per pengguna di semua halaman; diubah = tampil lagi |

## 6. Penawaran di dalam tool

Lihat `DESIGN-BGY.md` bagian 14. Ringkasnya, di setiap tool berbayar:
1. Setelah hasil gratis berhasil: `if(!isPro())window.bgyProNudge&&bgyProNudge({url:'<Lynk>',perks:[...]})`.
2. Di kotak Aktivasi/Upgrade: `<div data-bgy-proof="<tool>"></div>`.
3. Bila ada contoh hasil (PDF → WebP per halaman di `/<tool>/contoh/`): `<div data-bgy-contoh=... >`.
4. Tombol "Beli Pro" mengarah ke **Lynk**, bukan ke halaman aktivasi.

## 7. Keterbatasan yang sudah diketahui (disengaja, dianggap cukup)

- Tanda tangan pesanan hanya mengikat nomor pesanan, bukan produknya: pesanan produk murah bisa diklaim di halaman aktivasi produk lain. Aman selama harga produk Pro setara; kalau beda jauh, tambahkan nama produk ke data yang ditandatangani di toko.
- Batas harian di layar tetap dicek di browser (localStorage), tapi endpoint AI (`/api/generate-soal`, `/api/generate-modul-ajar`, `/api/generate-teks`) juga dijaga di server lewat `api/_gate.js` → RPC `bgy_ai_gate` (migrasi `20261013_ai_quota.sql`):
  - rate limit per menit per IP (soal 6, modul ajar 12, teks 10), berlaku untuk semua instance Vercel;
  - jatah gratis per IP per hari (soal 15, modul ajar 25, teks 20 panggilan API; satu modul ajar ±4–8 panggilan);
  - Pro dikenali dari email langganan aktif yang dikirim halaman (`pro_email` / `bgy_pro_ma.email`) → tanpa jatah harian.
  - Satu sekolah bisa berbagi satu IP (wifi sekolah); kalau ada keluhan "jatah habis", naikkan angka di fungsi `bgy_ai_gate`.
  - Jika migrasi belum dijalankan / Supabase tidak terjangkau, gerbang terbuka (API tetap jalan dengan limiter memori).
  - Email Pro bisa dipakai orang lain yang tahu emailnya (sama seperti fitur "Login Email").
- Repo GitHub publik, jadi nama file halaman aktivasi bisa terlihat.

## 8. Memakai pola ini di web baru

1. Buat produk di Kreacy; link file produk = halaman aktivasi web baru + `?order={order}&sig={sig}`.
2. Tambah nilai `access` baru (mis. `'nama_tool'`) di daftar yang diizinkan pada ketiga fungsi RPC (`normalized_access not in (...)`), lalu jalankan ulang migrasi.
3. Salin halaman aktivasi (`aktvs-ma.html`) → ganti `p_access`, judul, dan link WA.
4. Di tool: `isPro()` membaca localStorage dengan **kunci unik**, fungsi aktivasi kode (`bgy_activate_pro`) & login email (`bgy_subscription_status`), konstanta `DAILY_LIMIT`.
5. Pasang komponen penawaran (bagian 6) dan daftarkan tool di Beranda dengan label "Gratis · Ada Limit".
6. Endpoint AI baru mengikuti `DESIGN-BGY.md` bagian 15 (origin, batas per IP, batas prompt, kunci di env).
