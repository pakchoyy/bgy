-- Link bio (/k), ulasan pengguna (Beranda + form di tiap tool), dan admin (/admin).
-- Jalankan sekali di Supabase → SQL Editor. Aman dijalankan ulang.
-- SETELAH itu, daftarkan email admin (email akun di Authentication → Users):
--   insert into public.bgy_admins (email) values ('email-kamu@contoh.com') on conflict do nothing;
begin;

-- ═══ Admin ═══
create table if not exists public.bgy_admins (
  email text primary key
);
alter table public.bgy_admins enable row level security;
revoke all on table public.bgy_admins from anon, authenticated;

create or replace function public.bgy_is_admin()
returns boolean
language sql stable security definer set search_path = pg_catalog, public
as $$
  select exists (
    select 1 from public.bgy_admins a
    where lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;
revoke all on function public.bgy_is_admin() from public;
grant execute on function public.bgy_is_admin() to anon, authenticated;

-- ═══ Link bio ═══
create table if not exists public.bgy_bio_links (
  id bigint generated always as identity primary key,
  title text not null check (char_length(title) between 1 and 120),
  subtitle text check (subtitle is null or char_length(subtitle) <= 160),
  url text not null check (url ~* '^https?://' and char_length(url) <= 500),
  icon text not null default 'link' check (icon ~ '^[a-z-]{1,30}$'),
  badge text check (badge is null or char_length(badge) <= 20),
  sort integer not null default 0,
  active boolean not null default true,
  clicks integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.bgy_bio_links enable row level security;
revoke all on table public.bgy_bio_links from anon, authenticated;
grant select on table public.bgy_bio_links to anon, authenticated;
grant insert, update, delete on table public.bgy_bio_links to authenticated;

drop policy if exists bio_public_read on public.bgy_bio_links;
create policy bio_public_read on public.bgy_bio_links
  for select using (active or public.bgy_is_admin());
drop policy if exists bio_admin_write on public.bgy_bio_links;
create policy bio_admin_write on public.bgy_bio_links
  for all to authenticated using (public.bgy_is_admin()) with check (public.bgy_is_admin());

create or replace function public.bgy_bio_click(p_id bigint)
returns void
language sql security definer set search_path = pg_catalog, public
as $$
  update public.bgy_bio_links set clicks = clicks + 1 where id = p_id and active;
$$;
revoke all on function public.bgy_bio_click(bigint) from public;
grant execute on function public.bgy_bio_click(bigint) to anon, authenticated;

insert into public.bgy_bio_links (title, subtitle, url, icon, badge, sort)
select * from (values
  ('Semua Tools Bantu Guru Yuk', 'Buat soal, modul ajar, LKPD, surat sekolah & lainnya', 'https://www.bantuguruyuk.web.id/', 'sparkles', 'Gratis', 10),
  ('Masuk Channel Pak Choy', 'Saluran WhatsApp MEDIA BERBAGI YUK (gratis)', 'https://whatsapp.com/channel/0029VbCVekoDJ6HAqLXbkv3s', 'whatsapp', null, 20),
  ('File & Lisensi Aplikasi Pak Choy', 'lynk.id/kreacy', 'https://lynk.id/kreacy', 'bag', null, 30),
  ('Aplikasi Wali Kelas', 'wkelas.web.id (free*)', 'https://wkelas.web.id', 'school', null, 40)
) as seed(title, subtitle, url, icon, badge, sort)
where not exists (select 1 from public.bgy_bio_links);

-- ═══ Ulasan ═══
create table if not exists public.bgy_reviews (
  id bigint generated always as identity primary key,
  tool text not null check (tool ~ '^[a-z0-9-]{1,40}$'),
  rating smallint not null check (rating between 1 and 5),
  body text check (body is null or char_length(body) <= 600),
  name text check (name is null or char_length(name) <= 60),
  school text check (school is null or char_length(school) <= 80),
  approved boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists bgy_reviews_created_idx on public.bgy_reviews (created_at desc);
alter table public.bgy_reviews enable row level security;
revoke all on table public.bgy_reviews from anon, authenticated;
grant select on table public.bgy_reviews to anon, authenticated;
grant update, delete on table public.bgy_reviews to authenticated;

drop policy if exists reviews_public_read on public.bgy_reviews;
create policy reviews_public_read on public.bgy_reviews
  for select using (approved or public.bgy_is_admin());
drop policy if exists reviews_admin_update on public.bgy_reviews;
create policy reviews_admin_update on public.bgy_reviews
  for update to authenticated using (public.bgy_is_admin()) with check (public.bgy_is_admin());
drop policy if exists reviews_admin_delete on public.bgy_reviews;
create policy reviews_admin_delete on public.bgy_reviews
  for delete to authenticated using (public.bgy_is_admin());

-- Kirim ulasan hanya lewat fungsi ini (dibersihkan + dibatasi supaya tidak dibanjiri spam).
create or replace function public.bgy_submit_review(p_tool text, p_rating int, p_body text, p_name text, p_school text)
returns text
language plpgsql security definer set search_path = pg_catalog, public
as $$
declare
  v_tool text := lower(trim(coalesce(p_tool, '')));
  v_body text := nullif(left(trim(coalesce(p_body, '')), 600), '');
  v_name text := nullif(left(trim(coalesce(p_name, '')), 60), '');
  v_school text := nullif(left(trim(coalesce(p_school, '')), 80), '');
begin
  if v_tool !~ '^[a-z0-9-]{1,40}$' or p_rating is null or p_rating not between 1 and 5 then
    return 'invalid';
  end if;
  if (select count(*) from public.bgy_reviews where created_at > now() - interval '10 minutes') >= 40 then
    return 'busy';
  end if;
  if v_body is not null and exists (
    select 1 from public.bgy_reviews where body = v_body and created_at > now() - interval '1 day'
  ) then
    return 'duplicate';
  end if;
  insert into public.bgy_reviews (tool, rating, body, name, school)
  values (v_tool, p_rating, v_body, v_name, v_school);
  return 'ok';
end;
$$;
revoke all on function public.bgy_submit_review(text, int, text, text, text) from public;
grant execute on function public.bgy_submit_review(text, int, text, text, text) to anon, authenticated;

create or replace function public.bgy_review_stats()
returns table (avg_rating numeric, total bigint)
language sql stable security definer set search_path = pg_catalog, public
as $$
  select round(avg(rating)::numeric, 1), count(*) from public.bgy_reviews where approved;
$$;
revoke all on function public.bgy_review_stats() from public;
grant execute on function public.bgy_review_stats() to anon, authenticated;

commit;
