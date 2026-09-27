-- Admin hanya dikenali bila email akunnya sudah terverifikasi di Supabase Auth.
-- Mencegah orang mendaftar memakai email admin (bila "Confirm email" nonaktif) lalu dianggap admin.
-- Jalankan sekali di Supabase → SQL Editor. Aman dijalankan ulang.
create or replace function public.bgy_is_admin()
returns boolean
language sql stable security definer set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.bgy_admins a
    join auth.users u on lower(u.email) = lower(a.email)
    where u.id = auth.uid()
      and u.email_confirmed_at is not null
  );
$$;
revoke all on function public.bgy_is_admin() from public;
grant execute on function public.bgy_is_admin() to anon, authenticated;
