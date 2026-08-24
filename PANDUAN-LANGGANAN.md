# Langganan tahunan BGY

## Aturan akses

- Pelanggan Pro sebelum perubahan ini: `lifetime`.
- Pembelian baru: `annual`, aktif selama satu tahun dari pembayaran terverifikasi.
- Akses aplikasi hanya aktif bila `is_pro = true` dan paket masih aktif.

## Alur Lynk (manual seperti sekarang)

1. Pembeli menyelesaikan pembayaran di Lynk.
2. Admin memverifikasi transaksi.
3. Admin menambahkan atau memperbarui baris di `public.users` untuk fitur yang dibeli.
4. Isi `is_pro = true`, `plan_type = annual`, dan `active_until` satu tahun ke depan.
5. Pembeli login memakai email atau kode yang sama di aplikasi.

## Perpanjangan

Setelah pembayaran perpanjangan diverifikasi, tambah satu tahun dari tanggal yang paling akhir antara hari ini atau masa aktif saat ini.

## Penting

Browser tidak boleh lagi mengubah `is_pro`, `plan_type`, atau `active_until`. Pastikan RLS Supabase hanya mengizinkan proses admin yang melakukan perubahan tersebut.
