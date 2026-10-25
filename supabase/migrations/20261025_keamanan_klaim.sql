-- Keamanan + klaim pesanan Kreacy. Jalankan sekali di Supabase BGY -> SQL Editor. Aman dijalankan ulang.
-- 1. Data admin (key admin_*) di bgy_settings tidak lagi bisa dibaca publik.
-- 2. Batas percobaan kode LKPD lama (4 angka) dihitung di database: 5/menit, 20/hari per IP.
-- 3. Kode Pro hanya bisa didapat lewat link pesanan Kreacy (?order=..&sig=..): satu pesanan = satu klaim.
--    Setelah menjalankan file ini, isi rahasia yang SAMA dengan env KLAIM_HMAC_SECRET di project toko:
--      insert into public.bgy_private (key, value) values ('klaim_hmac_secret', 'ISI_RAHASIA')
--      on conflict (key) do update set value = excluded.value;
-- Rollback ada di bagian bawah file (dikomentari).
begin;

create extension if not exists pgcrypto with schema extensions;

-- ═══ 1. Data admin tertutup ═══
drop policy if exists settings_public_read on public.bgy_settings;
create policy settings_public_read on public.bgy_settings for select
  using (key not like 'admin\_%' or public.bgy_is_admin());

-- ═══ 2. Gerbang: tambah 'lkpd_code' ═══
create or replace function public.bgy_ai_gate(p_tool text, p_ip text, p_email text default null)
returns text
language plpgsql security definer set search_path = pg_catalog, public
as $$
declare
  v_tool text := lower(trim(coalesce(p_tool, '')));
  v_ip text := left(trim(coalesce(p_ip, '')), 64);
  v_email text := lower(trim(coalesce(p_email, '')));
  v_hash text;
  v_per_min int;
  v_free_day int;
  v_access text;
  v_pro boolean := false;
  v_day_start timestamptz := (date_trunc('day', now() at time zone 'Asia/Jakarta')) at time zone 'Asia/Jakarta';
begin
  if v_tool = 'soal' then v_per_min := 6; v_free_day := 15; v_access := 'soal';
  elsif v_tool = 'modul_ajar' then v_per_min := 12; v_free_day := 25; v_access := 'modul_ajar';
  elsif v_tool = 'teks' then v_per_min := 10; v_free_day := 20; v_access := null;
  elsif v_tool = 'lkpd_code' then v_per_min := 5; v_free_day := 20; v_access := null;
  else return 'invalid';
  end if;
  if v_ip = '' then return 'invalid'; end if;
  v_hash := md5('bgy:' || v_ip);

  if (select count(*) from public.bgy_ai_usage
      where ip_hash = v_hash and tool = v_tool and created_at > now() - interval '1 minute') >= v_per_min then
    return 'rate';
  end if;

  if v_access is not null and v_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    select exists (
      select 1 from public.users u
      where lower(u.email) = v_email and u.access = v_access and u.is_pro
        and (u.plan_type is distinct from 'annual' or u.active_until > now())
    ) into v_pro;
  end if;

  if not v_pro and (select count(*) from public.bgy_ai_usage
      where ip_hash = v_hash and tool = v_tool and not is_pro and created_at >= v_day_start) >= v_free_day then
    return 'quota';
  end if;

  insert into public.bgy_ai_usage (tool, ip_hash, is_pro) values (v_tool, v_hash, v_pro);
  if random() < 0.02 then
    delete from public.bgy_ai_usage where created_at < now() - interval '2 days';
  end if;
  return case when v_pro then 'ok_pro' else 'ok' end;
end;
$$;
revoke all on function public.bgy_ai_gate(text, text, text) from public;
grant execute on function public.bgy_ai_gate(text, text, text) to anon, authenticated;

-- ═══ 3. Klaim pesanan Kreacy ═══
create table if not exists public.bgy_private (
  key text primary key,
  value text not null
);
alter table public.bgy_private enable row level security;
revoke all on table public.bgy_private from anon, authenticated;

create table if not exists public.bgy_order_claims (
  order_id text primary key,
  email text not null,
  access text not null,
  code text not null,
  created_at timestamptz not null default now()
);
alter table public.bgy_order_claims enable row level security;
revoke all on table public.bgy_order_claims from anon, authenticated;
grant select on table public.bgy_order_claims to authenticated;
drop policy if exists order_claims_admin_read on public.bgy_order_claims;
create policy order_claims_admin_read on public.bgy_order_claims for select to authenticated
  using (public.bgy_is_admin());

-- Hasil: ok (kode baru/diperpanjang), again (pesanan ini sudah diklaim email yang sama),
-- claimed (sudah diklaim email lain), bad_sig, not_ready (rahasia belum diisi), invalid.
create or replace function public.bgy_claim_order(p_order text, p_sig text, p_email text, p_access text)
returns table (result text, activation_code text)
language plpgsql security definer set search_path = pg_catalog, public, extensions
as $$
declare
  v_order text := left(trim(coalesce(p_order, '')), 80);
  v_sig text := lower(trim(coalesce(p_sig, '')));
  v_email text := lower(trim(coalesce(p_email, '')));
  v_access text := lower(trim(coalesce(p_access, '')));
  v_secret text;
  v_claim record;
  v_user record;
  v_code text;
begin
  if v_order = '' or v_sig !~ '^[0-9a-f]{64}$'
     or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
     or v_access not in ('soal', 'modul_ajar', 'kokurikuler', 'lkpd') then
    return query select 'invalid'::text, null::text; return;
  end if;

  select value into v_secret from public.bgy_private where key = 'klaim_hmac_secret';
  if v_secret is null or v_secret = '' then
    return query select 'not_ready'::text, null::text; return;
  end if;
  if v_sig <> encode(extensions.hmac(v_order, v_secret, 'sha256'), 'hex') then
    return query select 'bad_sig'::text, null::text; return;
  end if;

  select * into v_claim from public.bgy_order_claims where order_id = v_order;
  if found then
    if v_claim.email = v_email and v_claim.access = v_access then
      return query select 'again'::text, v_claim.code; return;
    end if;
    return query select 'claimed'::text, null::text; return;
  end if;

  select u.is_pro, u.code, u.plan_type, u.active_until into v_user from public.users u
  where lower(u.email) = v_email and u.access = v_access limit 1 for update;
  if found then
    v_code := coalesce(v_user.code, 'BGY-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 5)));
    -- Lifetime lama tidak diubah; selain itu aktif/diperpanjang 1 tahun dari tanggal terakhir yang lebih jauh.
    if not (v_user.is_pro and v_user.plan_type is distinct from 'annual') then
      update public.users u set is_pro = true, plan_type = 'annual', purchased_at = now(), code = v_code,
        active_until = greatest(coalesce(u.active_until, now()), now()) + interval '1 year'
      where lower(u.email) = v_email and u.access = v_access;
    end if;
  else
    v_code := 'BGY-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 5));
    insert into public.users (email, code, access, is_pro, plan_type, active_until, purchased_at)
    values (v_email, v_code, v_access, true, 'annual', now() + interval '1 year', now());
  end if;

  insert into public.bgy_order_claims (order_id, email, access, code) values (v_order, v_email, v_access, v_code);
  return query select 'ok'::text, v_code;
end;
$$;
revoke all on function public.bgy_claim_order(text, text, text, text) from public;
grant execute on function public.bgy_claim_order(text, text, text, text) to anon, authenticated;

-- Celah lama: siapa pun bisa minta kode untuk email apa saja tanpa bayar.
revoke execute on function public.bgy_request_activation_code(text, text) from public, anon, authenticated;

commit;

-- ═══ Rollback (jalankan manual bila perlu) ═══
-- drop policy if exists settings_public_read on public.bgy_settings;
-- create policy settings_public_read on public.bgy_settings for select using (true);
-- grant execute on function public.bgy_request_activation_code(text, text) to anon, authenticated;
-- drop function if exists public.bgy_claim_order(text, text, text, text);
