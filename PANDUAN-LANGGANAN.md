# Langganan tahunan BGY

## Aturan akses

- Pelanggan lama: `is_pro=true` dan `plan_type` bukan `annual` selalu lifetime, termasuk `plan_type` kosong.
- Pelanggan annual: aktif hanya bila `is_pro=true`, `plan_type=annual`, dan `active_until` masih di masa depan.
- `active_until` kosong tidak membuat pelanggan lifetime menjadi FREE.

## Alur aman

1. Halaman aktivasi meminta kandidat aman lewat RPC `bgy_request_activation_code`.
2. Browser hanya mengirim email, kode, dan jenis akses ke RPC `bgy_activate_pro`.
3. RPC memvalidasi pasangan tersebut dan hanya mengubah kandidat FREE tanpa plan menjadi annual satu kali.
4. Login memakai RPC `bgy_subscription_status`; tabel `users` tidak dapat dibaca atau diubah langsung oleh anon.
5. Kode annual lama tidak memperpanjang langganan yang kedaluwarsa.

Karena migrasi paket 20260824 sudah pernah diterapkan, jalankan hanya 20260827_secure_pro_activation.sql di Supabase sebelum frontend baru dipublikasikan. Jangan menjalankan ulang migrasi 20260824 dan jangan menaruh service role key di browser.

## Perpanjangan

Admin memperpanjang hanya setelah pembayaran diverifikasi, dari tanggal paling akhir antara sekarang dan `active_until`. Proses ini tidak diberikan kepada anon.

## Data spam

Jangan hapus data lama sebelum backup dan review. Sumber utama spam sebelumnya adalah policy INSERT/UPDATE anon tanpa batas dan pembuatan kandidat publik. RPC baru membatasi bentuk record, tetapi belum melakukan rate limit. Tahap berikutnya yang disarankan adalah memindahkan pembuatan kandidat ke webhook pembayaran atau Edge Function dengan CAPTCHA/rate limit, lalu menandai kandidat terverifikasi sebelum aktivasi.
