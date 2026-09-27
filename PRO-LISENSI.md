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
| Prompt LKPD (`/lkpd/`) | `FREE_LIMIT = 2`×/hari, riwayat 5 | Tanpa batas, riwayat 50 | `https://lynk.id/kreacy/nq35v4y36gz8` | — (kode dari admin) | Cloudflare Worker · `bgy_pro_lkpd` |

**Aturan:** teks batas di halaman/Beranda harus memakai konstanta (`DAILY_LIMIT`, `FREE_LIMIT`), jangan angka ketik manual. Kunci localStorage **harus unik per tool** (semua tool satu domain, jadi kunci yang sama akan saling menimpa).

## 3. Alur aktivasi (Soal, Modul Ajar, Kokurikuler)

```
Beli di Lynk ──► Lynk mengarahkan ke /aktvs-xx.html
                 └─ isi email pembelian → RPC bgy_request_activation_code(email, access)
                    → keluar kode BGY-XXXXX (baris baru: is_pro=false, plan_type=null)
Buka tool ──► tab "Kode Aktivasi": email + kode → RPC bgy_activate_pro(email, code, access)
              → baris jadi is_pro=true, plan_type='annual', active_until = sekarang + 1 tahun
              → status disimpan di localStorage tool
Ganti HP / hapus data ──► tab "Login Email": RPC bgy_subscription_status(email, access)
```

- Status Pro dianggap aktif bila `is_pro = true` **dan** (`plan_type` bukan `annual` **atau** `active_until` masih di masa depan).
- Kode yang sama tidak bisa memperpanjang paket yang sudah kedaluwarsa.
- **Perpanjangan** dilakukan admin lewat SQL setelah pembayaran terverifikasi:
  ```sql
  update public.users
  set active_until = greatest(active_until, now()) + interval '1 year'
  where lower(email) = lower('guru@contoh.com') and access = 'soal';
  ```

### LKPD (sistem lama)
Kode Pro dibuat manual (format `BGY-XXXX-0000`) dan didaftarkan di env Cloudflare Worker `PRO_CODES` (dipisah koma). Tool memanggil `https://bgypro.pulsachoy.workers.dev/validate`. Kode di `lkpd/worker.js`.

## 4. Database Supabase

Proyek: `xtmpiqpmwirsrcsphsto.supabase.co` (anon key boleh di browser, service role key **tidak pernah**).

| Tabel / fungsi | Isi | Akses |
|---|---|---|
| `users` | `email, code, access, is_pro, plan_type, active_until, purchased_at` | RLS aktif, anon **tidak bisa** baca/tulis langsung |
| `bgy_request_activation_code(p_email, p_access)` | buat/ambil kode pending | anon (RPC) |
| `bgy_activate_pro(p_email, p_code, p_access)` | aktifkan annual sekali | anon (RPC) |
| `bgy_subscription_status(p_email, p_access)` | cek status untuk login email | anon (RPC) |
| `bgy_admins` + `bgy_is_admin()` | daftar email admin (harus email terverifikasi) | hanya lewat fungsi |
| `bgy_reviews` + `bgy_submit_review()` + `bgy_review_stats()` | ulasan pengguna | baca publik (yang disetujui), tulis lewat RPC |
| `bgy_bio_links` + `bgy_bio_click()` | link di `/k` | baca publik, tulis admin |
| `bgy_settings` (key `promo`) | promo, voucher, bundling, garansi | baca publik, tulis admin |
| `bgy_events` + `bgy_track()` + `bgy_usage_stats()` | statistik pemakaian anonim (ID acak per browser): open, hasil, pro, install, share | tulis lewat RPC (maks 300/hari per browser), ringkasan hanya admin |

File migrasi di `supabase/migrations/` — jalankan berurutan di Supabase → SQL Editor. Semua aman dijalankan ulang.

## 5. Admin (`/admin`)

Login email + sandi Supabase Auth. Email harus ada di `bgy_admins`:
```sql
insert into public.bgy_admins (email) values ('email-kamu@contoh.com') on conflict do nothing;
```
Tab: **Link Bio** (`/k`), **Ulasan** (tampil/sembunyikan/edit/hapus), **Promo**, **Statistik** (guru unik hari ini/7/30 hari, grafik harian, tabel per tool; dicatat otomatis oleh `bgy-info.js`).

**Tab Promo** (tampil otomatis di kartu tawaran Pro & dekat tombol Beli semua tool berbayar):
| Kolom | Contoh | Catatan |
|---|---|---|
| Tampilkan promo + teks | `Diskon 30% menjelang ASAS` | wajib diisi bila promo dinyalakan |
| Berlaku sampai | `2026-12-10` | otomatis hilang setelah tanggal ini |
| Link promo | `https://lynk.id/...` | opsional, wajib `https://` |
| Kode voucher + keterangan | `TEMANGURU` · `diskon 10%` | juga ikut di pesan "Bagikan ke teman guru" |
| Paket bundling | `Paket Guru Pro (semua tool)` + link | |
| Garansi | `Garansi uang kembali 3 hari` | tulis hanya bila benar-benar diberikan |

## 6. Penawaran di dalam tool

Lihat `DESIGN-BGY.md` bagian 14. Ringkasnya, di setiap tool berbayar:
1. Setelah hasil gratis berhasil: `if(!isPro())window.bgyProNudge&&bgyProNudge({url:'<Lynk>',perks:[...]})`.
2. Di kotak Aktivasi/Upgrade: `<div data-bgy-proof="<tool>"></div>`.
3. Bila ada contoh hasil (PDF → WebP per halaman di `/<tool>/contoh/`): `<div data-bgy-contoh=... >`.
4. Tombol "Beli Pro" mengarah ke **Lynk**, bukan ke halaman aktivasi.

## 7. Keterbatasan yang sudah diketahui (disengaja, dianggap cukup)

- Halaman aktivasi hanya "tersembunyi" (tidak ditautkan dari aplikasi, `noindex`). Orang yang tahu alamatnya bisa meminta kode untuk email apa saja. Kalau suatu saat perlu lebih ketat: admin memasukkan email pembeli di `/admin`, dan kode hanya keluar untuk email itu.
- Status Pro dan batas harian dicek di browser (localStorage). Endpoint AI hanya dibatasi per IP, belum memeriksa status Pro di server.
- Repo GitHub publik, jadi nama file halaman aktivasi bisa terlihat.

## 8. Memakai pola ini di web baru

1. Buat produk di Lynk; setel "redirect setelah bayar" ke halaman aktivasi web baru.
2. Tambah nilai `access` baru (mis. `'nama_tool'`) di daftar yang diizinkan pada ketiga fungsi RPC (`normalized_access not in (...)`), lalu jalankan ulang migrasi.
3. Salin halaman aktivasi (`aktvs-ma.html`) → ganti `p_access`, judul, dan link WA.
4. Di tool: `isPro()` membaca localStorage dengan **kunci unik**, fungsi aktivasi kode (`bgy_activate_pro`) & login email (`bgy_subscription_status`), konstanta `DAILY_LIMIT`.
5. Pasang komponen penawaran (bagian 6) dan daftarkan tool di Beranda dengan label "Gratis · Ada Limit".
6. Endpoint AI baru mengikuti `DESIGN-BGY.md` bagian 15 (origin, batas per IP, batas prompt, kunci di env).
