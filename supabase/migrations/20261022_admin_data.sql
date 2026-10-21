-- Admin dashboard: pastikan tabel bgy_settings siap menampung data admin.
-- Naikkan limit size per row dari 8KB -> 100KB (cukup untuk ratusan proyek/langganan).
-- Idempotent: aman dijalankan ulang. Juga aman kalau migrasi 20260928_settings_promo.sql
-- belum pernah dijalankan — SQL ini akan membuat tabelnya.
--
-- Semua data admin (Portal, Proyek Jokian, Proyek Sendiri, Langganan) tersimpan
-- di tabel bgy_settings dengan key:
--   - admin_portal           -> array portal
--   - admin_proyek_jokian    -> array proyek klien
--   - admin_proyek_sendiri   -> array proyek pribadi
--   - admin_langganan        -> array langganan
-- Tidak perlu tabel terpisah per fitur.

begin;

-- 1) Pastikan tabel ada
create table if not exists public.bgy_settings (
  key text primary key check (key ~ '^[a-z0-9_]{1,40}$'),
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- 2) Ganti constraint size (lama 8000 -> baru 100000)
alter table public.bgy_settings
  drop constraint if exists bgy_settings_value_check;
alter table public.bgy_settings
  add constraint bgy_settings_value_check check (pg_column_size(value) <= 100000);

-- 3) Pastikan RLS enabled + policy benar
alter table public.bgy_settings enable row level security;
revoke all on table public.bgy_settings from anon, authenticated;
grant select on table public.bgy_settings to anon, authenticated;
grant insert, update, delete on table public.bgy_settings to authenticated;

drop policy if exists settings_public_read on public.bgy_settings;
create policy settings_public_read on public.bgy_settings for select using (true);

drop policy if exists settings_admin_write on public.bgy_settings;
create policy settings_admin_write on public.bgy_settings
  for all to authenticated using (public.bgy_is_admin()) with check (public.bgy_is_admin());

-- 4) Siapkan baris kosong untuk key admin (biar admin UI tidak error saat load pertama)
insert into public.bgy_settings (key, value) values
  ('admin_portal', '[]'::jsonb),
  ('admin_proyek_jokian', '[]'::jsonb),
  ('admin_proyek_sendiri', '[]'::jsonb),
  ('admin_langganan', '[]'::jsonb)
on conflict (key) do nothing;

commit;
