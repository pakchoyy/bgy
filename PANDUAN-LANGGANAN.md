# Langganan tahunan BGY

## Aturan akses

- Pelanggan Pro sebelum perubahan ini: `lifetime`.
- Pembelian baru: `annual`, aktif selama satu tahun dari pembayaran terverifikasi.
- Akses aplikasi hanya aktif bila `is_pro = true` dan paket masih aktif.

## Alur Lynk (manual seperti sekarang)

1. Pembeli menyelesaikan pembayaran di Lynk.
2. Admin memverifikasi transaksi.
3. Kode pembeli tersimpan sebagai baris pending: `is_pro = false` dan `plan_type` kosong.
4. Saat kode valid pertama kali dipakai, aplikasi mengubahnya menjadi `annual` dengan masa aktif satu tahun.
5. Kode yang sudah kedaluwarsa tidak dapat memperpanjang dirinya sendiri; perpanjangan tetap diverifikasi admin.

## Perpanjangan

Setelah pembayaran perpanjangan diverifikasi, tambah satu tahun dari tanggal yang paling akhir antara hari ini atau masa aktif saat ini.

## Penting

Aktivasi browser hanya berlaku satu kali untuk kode pending yang belum mempunyai `plan_type`. Untuk keamanan yang lebih kuat di masa depan, proses ini sebaiknya dipindahkan ke Edge Function/webhook setelah pembayaran.
