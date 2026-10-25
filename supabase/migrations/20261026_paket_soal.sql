-- Paket Buat Soal PLUS / PRO. Aman dijalankan ulang. Rollback di bawah (dikomentari).
-- Link produk Kreacy: aktvs-bs.html?t=soal_plus|soal_pro&order={order}&sig={sig}
-- Toko otomatis menambah sig2 = HMAC(KLAIM_HMAC_SECRET, 'v2:<t>:<order>') sehingga paket tidak bisa ditukar.
-- Aturan aktif (semua fungsi): is_pro dan (active_until kosong = lifetime, atau active_until belum lewat).
begin;

alter table public.users add column if not exists tier text;
alter table public.users drop constraint if exists users_tier_check;
alter table public.users add constraint users_tier_check check (tier is null or tier in ('plus', 'pro'));

-- ═══ Klaim pesanan paket (overload 6 argumen) ═══
create or replace function public.bgy_claim_order(p_order text, p_sig text, p_email text, p_access text, p_paket text, p_sig2 text)
returns table (result text, activation_code text)
language plpgsql security definer set search_path = pg_catalog, public, extensions
as $$
declare
  v_order text := left(trim(coalesce(p_order, '')), 80);
  v_sig text := lower(trim(coalesce(p_sig, '')));
  v_sig2 text := lower(trim(coalesce(p_sig2, '')));
  v_email text := lower(trim(coalesce(p_email, '')));
  v_access text := lower(trim(coalesce(p_access, '')));
  v_paket text := lower(trim(coalesce(p_paket, '')));
  v_tier text;
  v_bulan int;
  v_secret text;
  v_claim record;
  v_user record;
  v_code text;
begin
  v_tier := case v_paket when 'soal_plus' then 'plus' when 'soal_pro' then 'pro' end;
  if v_tier is null or v_access <> 'soal' or v_order = ''
     or v_sig !~ '^[0-9a-f]{64}$' or v_sig2 !~ '^[0-9a-f]{64}$'
     or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    return query select 'invalid'::text, null::text; return;
  end if;

  select value into v_secret from public.bgy_private where key = 'klaim_hmac_secret';
  if v_secret is null or v_secret = '' then
    return query select 'not_ready'::text, null::text; return;
  end if;
  if v_sig <> encode(extensions.hmac(v_order, v_secret, 'sha256'), 'hex')
     or v_sig2 <> encode(extensions.hmac('v2:' || v_paket || ':' || v_order, v_secret, 'sha256'), 'hex') then
    return query select 'bad_sig'::text, null::text; return;
  end if;

  select * into v_claim from public.bgy_order_claims where order_id = v_order;
  if found then
    if v_claim.email = v_email and v_claim.access = v_access then
      return query select 'again'::text, v_claim.code; return;
    end if;
    return query select 'claimed'::text, null::text; return;
  end if;

  select coalesce(nullif(s.value -> v_tier ->> 'bulan', '')::int, case v_tier when 'plus' then 3 else 6 end)
    into v_bulan from (select 1) x left join public.bgy_settings s on s.key = 'paket_soal';
  v_bulan := least(greatest(coalesce(v_bulan, 3), 1), 24);

  select u.is_pro, u.code, u.active_until into v_user from public.users u
  where lower(u.email) = v_email and u.access = v_access limit 1 for update;
  if found then
    v_code := coalesce(v_user.code, 'BGY-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 5)));
    -- Lifetime lama (tanpa tanggal) sudah tanpa batas: tidak diubah.
    if not (v_user.is_pro and v_user.active_until is null) then
      update public.users u set is_pro = true, plan_type = 'paket', tier = v_tier, purchased_at = now(), code = v_code,
        active_until = greatest(coalesce(u.active_until, now()), now()) + make_interval(months => v_bulan)
      where lower(u.email) = v_email and u.access = v_access;
    end if;
  else
    v_code := 'BGY-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 5));
    insert into public.users (email, code, access, is_pro, plan_type, tier, active_until, purchased_at)
    values (v_email, v_code, v_access, true, 'paket', v_tier, now() + make_interval(months => v_bulan), now());
  end if;

  insert into public.bgy_order_claims (order_id, email, access, code) values (v_order, v_email, v_access, v_code);
  return query select 'ok'::text, v_code;
end;
$$;
revoke all on function public.bgy_claim_order(text, text, text, text, text, text) from public;
grant execute on function public.bgy_claim_order(text, text, text, text, text, text) to anon, authenticated;

-- ═══ Aktivasi & cek status: ikut kirim tier, aturan aktif berdasarkan tanggal ═══
drop function if exists public.bgy_activate_pro(text, text, text);
create function public.bgy_activate_pro(p_email text, p_code text, p_access text)
returns table (result text, is_pro boolean, plan_type text, active_until timestamptz, tier text)
language plpgsql security definer set search_path = pg_catalog, public
as $$
declare
  normalized_email text := lower(trim(p_email));
  normalized_code text := upper(trim(p_code));
  normalized_access text := lower(trim(p_access));
  r record;
begin
  if normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
     or normalized_code !~ '^BGY-[A-Z0-9]{5}$'
     or normalized_access not in ('soal', 'modul_ajar', 'kokurikuler', 'lkpd') then
    return query select 'invalid'::text, false, null::text, null::timestamptz, null::text; return;
  end if;

  select u.id, u.is_pro, u.plan_type, u.active_until, u.tier into r
  from public.users u
  where lower(u.email) = normalized_email and upper(u.code) = normalized_code and u.access = normalized_access
  limit 1 for update;
  if not found then
    return query select 'invalid'::text, false, null::text, null::timestamptz, null::text; return;
  end if;

  if r.is_pro and (r.active_until is null or r.active_until > now()) then
    return query select 'active'::text, true, r.plan_type::text, r.active_until, r.tier::text; return;
  end if;
  if r.is_pro then
    return query select 'expired'::text, true, r.plan_type::text, r.active_until, r.tier::text; return;
  end if;
  -- Baris lama yang menunggu aktivasi (dibuat sebelum klaim pesanan): aktif 1 tahun.
  if r.plan_type is null then
    update public.users u set is_pro = true, plan_type = 'annual', purchased_at = now(), active_until = now() + interval '1 year'
    where u.id = r.id returning u.is_pro, u.plan_type, u.active_until into r.is_pro, r.plan_type, r.active_until;
    return query select 'activated'::text, r.is_pro, r.plan_type::text, r.active_until, r.tier::text; return;
  end if;
  return query select 'inactive'::text, false, r.plan_type::text, r.active_until, r.tier::text;
end;
$$;
revoke all on function public.bgy_activate_pro(text, text, text) from public;
grant execute on function public.bgy_activate_pro(text, text, text) to anon, authenticated;

drop function if exists public.bgy_subscription_status(text, text);
create function public.bgy_subscription_status(p_email text, p_access text)
returns table (is_pro boolean, plan_type text, active_until timestamptz, tier text)
language plpgsql security definer set search_path = pg_catalog, public
as $$
declare
  normalized_email text := lower(trim(p_email));
  normalized_access text := lower(trim(p_access));
begin
  if normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
     or normalized_access not in ('soal', 'modul_ajar', 'kokurikuler', 'lkpd') then return; end if;
  return query select u.is_pro, u.plan_type, u.active_until, u.tier
    from public.users u where lower(u.email) = normalized_email and u.access = normalized_access limit 1;
end;
$$;
revoke all on function public.bgy_subscription_status(text, text) from public;
grant execute on function public.bgy_subscription_status(text, text) to anon, authenticated;

-- ═══ Gerbang AI: aktif berdasarkan tanggal; PLUS/PRO Buat Soal dibatasi per hari ═══
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
  v_tier text;
  v_cap int;
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
    select true, u.tier into v_pro, v_tier from public.users u
    where lower(u.email) = v_email and u.access = v_access and u.is_pro
      and (u.active_until is null or u.active_until > now())
    limit 1;
    v_pro := coalesce(v_pro, false);
  end if;

  if not v_pro and (select count(*) from public.bgy_ai_usage
      where ip_hash = v_hash and tool = v_tool and not is_pro and created_at >= v_day_start) >= v_free_day then
    return 'quota';
  end if;

  -- PLUS/PRO: 1 kali generate = sampai 3 panggilan API, jadi batas panggilan = 3 x generate per hari.
  if v_pro and v_tier is not null and v_tool = 'soal' then
    select 3 * coalesce(nullif(s.value -> v_tier ->> 'harian', '')::int, case v_tier when 'plus' then 4 else 10 end)
      into v_cap from (select 1) x left join public.bgy_settings s on s.key = 'paket_soal';
    if (select count(*) from public.bgy_ai_usage
        where ip_hash = v_hash and tool = v_tool and is_pro and created_at >= v_day_start) >= v_cap then
      return 'quota';
    end if;
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

commit;

-- ═══ Rollback (manual) ═══
-- drop function if exists public.bgy_claim_order(text, text, text, text, text, text);
-- jalankan ulang bagian bgy_activate_pro / bgy_subscription_status dari 20261018_lkpd_access.sql
-- dan bgy_ai_gate dari 20261025_keamanan_klaim.sql; kolom users.tier boleh dibiarkan.
