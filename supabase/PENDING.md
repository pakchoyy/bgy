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
7. Paket PRO semua tool (bila disetujui): `access = 'semua'` diterima `bgy_claim_order` / `bgy_activate_pro` / `bgy_subscription_status` / `bgy_ai_gate`, dan `isPro()` tiap tool menerima `semua`.
8. Pak Choy: ganti sandi yang pernah tersimpan di Proyek Sendiri/Jokian (sempat bisa dibaca publik sebelum langkah 1).
