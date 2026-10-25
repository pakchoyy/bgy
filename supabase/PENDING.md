# Menunggu Supabase (kerjakan saat MCP Supabase BGY tersambung)

Urutan penting: 1 → 2 → 3, baru 4.

1. Jalankan `migrations/20261025_keamanan_klaim.sql` (data `admin_*` tertutup, klaim pesanan Kreacy, tutup `bgy_request_activation_code`, batas kode LKPD).
2. Isi rahasia klaim = env `KLAIM_HMAC_SECRET` project toko (`bgy-store`). Nilainya dari Pak Choy; jangan buat baru (Presensi pakai yang sama).
   `insert into public.bgy_private (key, value) values ('klaim_hmac_secret', '...') on conflict (key) do update set value = excluded.value;`
3. Cek setelah migrasi (pakai anon key): `bgy_settings?key=like.admin_*` → 0 baris; RPC `bgy_request_activation_code` → ditolak; `bgy_claim_order` dengan sig salah → `bad_sig`.
4. Kreacy (MCP Kreacy, bukan Supabase): `file_url` 4 produk BGY ditambah `?order={order}&sig={sig}`
   - Buat Soal `761b0565-…` → `/aktvs-bs.html` · Modul Ajar `7e5f1e1f-…` → `/aktvs-ma.html`
   - Kokurikuler `cc028202-…` → `/aktvs-kkrklr.html` · LKPD `ece8a4ce-…` → `/aktvs-lkpd.html`
   Lalu uji beli sekali (harga sementara Rp1.000) dan klaim.
5. Auth (dashboard): template email **Magic Link** tambahkan `{{ .Token }}` agar kode login admin tampil; pastikan `https://www.bantuguruyuk.web.id/admin/` diizinkan di Redirect URLs.
6. Celah tukar produk: tanda tangan toko hanya mengikat nomor pesanan. Perlu: toko menandatangani `order:slug` (placeholder baru, mis. `{psig}`), lalu `bgy_claim_order` mencocokkan slug dengan `access`.
7. Paket Buat Soal PLUS/PRO (tampilan & batas di `soal/` + admin sudah jadi, saklar "Paket aktif" masih mati):
   - `users` tambah kolom `tier` ('plus'|'pro'); `bgy_claim_order` menerima paket, masa aktif dari `bgy_settings.paket_soal.<tier>.bulan`, isi `tier` + `active_until`.
   - `bgy_activate_pro` / `bgy_subscription_status` ikut mengembalikan `tier` (soal `savePro` sudah menyimpan `data.tier`).
   - Semua fungsi DB: anggap paket kedaluwarsa bila `active_until` lewat, apa pun `plan_type` (sekarang hanya `annual` yang dicek → paket baru akan dianggap seumur hidup di server).
   - Server: `api/generate-soal` cek kuota harian & maks soal per tier (sekarang hanya di browser); `bgy_ai_gate` jangan beri tanpa batas ke PLUS/PRO.
   - Kreacy: produk sudah dibuat sebagai DRAFT, link file sudah `aktvs-bs.html?paket=plus|pro&order={order}&sig={sig}`:
     PLUS `96f78f8f-9810-442f-9546-e347e40de306` → https://kreacy.my.id/produk/q2r3wwlv (Rp15.000)
     PRO `7ff6c17c-36fa-476d-86f0-a37af24afb74` → https://kreacy.my.id/produk/o3ye3a23 (Rp27.000)
     `aktvs-bs.html` belum meneruskan `paket` ke RPC. Paket WAJIB ikut ditandatangani (lihat no. 6) agar PLUS tidak bisa diklaim jadi PRO.
   - Terakhir: isi link beli di admin → nyalakan "Paket aktif".
8. Pak Choy: ganti sandi yang pernah tersimpan di Proyek Sendiri/Jokian (sempat bisa dibaca publik sebelum langkah 1).
