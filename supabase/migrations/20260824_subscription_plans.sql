-- BGY: paket lifetime untuk pembeli lama, annual untuk pembeli baru.
-- Jalankan sekali di Supabase SQL Editor, setelah membackup tabel public.users.

begin;

alter table public.users
  add column if not exists plan_type text,
  add column if not exists active_until timestamptz,
  add column if not exists purchased_at timestamptz;

-- Semua pelanggan Pro yang sudah ada tetap mendapat akses seumur hidup.
update public.users
set plan_type = 'lifetime',
    active_until = null,
    purchased_at = coalesce(purchased_at, now())
where is_pro = true
  and plan_type is null;

alter table public.users
  drop constraint if exists users_plan_type_check;

alter table public.users
  add constraint users_plan_type_check
  check (plan_type is null or plan_type in ('lifetime', 'annual'));

-- Annual wajib punya tanggal akhir; lifetime tidak perlu tanggal akhir.
alter table public.users
  drop constraint if exists users_subscription_dates_check;

alter table public.users
  add constraint users_subscription_dates_check
  check (
    plan_type is null
    or plan_type = 'lifetime'
    or (plan_type = 'annual' and active_until is not null)
  );

create index if not exists users_access_email_idx
  on public.users (access, email);

commit;

-- CONTOH aktivasi / perpanjangan pembeli baru SETELAH pembayaran Lynk terverifikasi.
-- Ubah nilai email, access, code, dan tanggal sesuai transaksi.
-- Untuk perpanjangan, gunakan UPDATE dengan active_until = greatest(active_until, now()) + interval '1 year'.
-- Aktivasi aplikasi hanya mengubah kode pending (is_pro=false, plan_type=null) satu kali.
-- Paket annual yang kedaluwarsa tidak diperpanjang otomatis oleh kode lama.
