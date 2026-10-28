-- Paket Modul Ajar PLUS / PRO (token ma_plus / ma_pro, pengaturan bgy_settings key 'paket_ma').
-- Link Kreacy: aktvs-ma.html?t=ma_plus|ma_pro&order={order}&sig={sig} (toko menambah sig2).
-- Default: PLUS 3 bulan 15x (maks 4x/hari), PRO 6 bulan 40x (maks 10x/hari). Aman dijalankan ulang.
begin;

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
  v_want text;
  v_key text;
  v_bulan int;
  v_secret text;
  v_claim record;
  v_user record;
  v_code text;
begin
  -- Token paket: soal_plus/soal_pro (Buat Soal), ma_plus/ma_pro (Modul Ajar).
  v_tier := case split_part(v_paket, '_', 2) when 'plus' then 'plus' when 'pro' then 'pro' end;
  v_want := case split_part(v_paket, '_', 1) when 'soal' then 'soal' when 'ma' then 'modul_ajar' end;
  v_key := case v_want when 'soal' then 'paket_soal' when 'modul_ajar' then 'paket_ma' end;
  if v_tier is null or v_want is null or v_access <> v_want or v_order = ''
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
    into v_bulan from (select 1) x left join public.bgy_settings s on s.key = v_key;
  v_bulan := least(greatest(coalesce(v_bulan, 3), 1), 24);

  select u.is_pro, u.code, u.active_until into v_user from public.users u
  where lower(u.email) = v_email and u.access = v_access limit 1 for update;
  if found then
    v_code := coalesce(v_user.code, 'BGY-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 5)));
    -- Lifetime lama (tanpa tanggal) sudah tanpa batas: tidak diubah.
    if not (v_user.is_pro and v_user.active_until is null) then
      update public.users u set is_pro = true, plan_type = 'paket', tier = v_tier, paket_calls = 0, purchased_at = now(), code = v_code,
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
  v_key text;
  v_mult int;
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

  -- PLUS/PRO: batas per hari dan kuota selama masa aktif, dihitung per panggilan API.
  -- Buat Soal: 1 generate = sampai 3 panggilan. Modul Ajar langsung jadi: 4 tahap + coba ulang, jadi 6.
  if v_pro and v_tier is not null and v_tool in ('soal', 'modul_ajar') then
    v_key := case v_tool when 'soal' then 'paket_soal' else 'paket_ma' end;
    v_mult := case v_tool when 'soal' then 3 else 6 end;
    select v_mult * coalesce(nullif(s.value -> v_tier ->> 'harian', '')::int, case v_tier when 'plus' then 4 else 10 end)
      into v_cap from (select 1) x left join public.bgy_settings s on s.key = v_key;
    if (select count(*) from public.bgy_ai_usage
        where ip_hash = v_hash and tool = v_tool and is_pro and created_at >= v_day_start) >= v_cap then
      return 'quota';
    end if;
    select v_mult * coalesce(nullif(s.value -> v_tier ->> 'kuota', '')::int,
        case v_tool when 'soal' then case v_tier when 'plus' then 20 else 50 end else case v_tier when 'plus' then 15 else 40 end end)
      into v_cap from (select 1) x left join public.bgy_settings s on s.key = v_key;
    update public.users u set paket_calls = u.paket_calls + 1
      where lower(u.email) = v_email and u.access = v_access and u.paket_calls < v_cap;
    if not found then return 'paket'; end if;
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
-- jalankan ulang bgy_claim_order (6 argumen) dan bgy_ai_gate dari 20261027_kuota_paket.sql.
