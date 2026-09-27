-- Pengaturan yang diisi dari /admin (tab Promo): promo, paket bundling, voucher, garansi.
-- Dibaca publik oleh tool berbayar (lewat /bgy-info.js), hanya admin yang bisa mengubah.
-- Jalankan sekali di Supabase → SQL Editor. Aman dijalankan ulang.
begin;

create table if not exists public.bgy_settings (
  key text primary key check (key ~ '^[a-z0-9_]{1,40}$'),
  value jsonb not null default '{}'::jsonb check (pg_column_size(value) <= 8000),
  updated_at timestamptz not null default now()
);
alter table public.bgy_settings enable row level security;
revoke all on table public.bgy_settings from anon, authenticated;
grant select on table public.bgy_settings to anon, authenticated;
grant insert, update, delete on table public.bgy_settings to authenticated;

drop policy if exists settings_public_read on public.bgy_settings;
create policy settings_public_read on public.bgy_settings for select using (true);
drop policy if exists settings_admin_write on public.bgy_settings;
create policy settings_admin_write on public.bgy_settings
  for all to authenticated using (public.bgy_is_admin()) with check (public.bgy_is_admin());

insert into public.bgy_settings (key, value) values ('promo', '{}'::jsonb) on conflict do nothing;

commit;
