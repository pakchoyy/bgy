-- Gerbang AI: batas per menit untuk Pro/paket dilonggarkan 3x (Buat Soal 18/menit, Modul Ajar 36/menit).
-- Keluhan: pembeli Pro tidak bisa generate ulang beruntun karena kena batas 6 panggilan/menit.
begin;

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

  if v_access is not null and v_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    select true, u.tier into v_pro, v_tier from public.users u
    where lower(u.email) = v_email and u.access = v_access and u.is_pro
      and (u.active_until is null or u.active_until > now())
    limit 1;
    v_pro := coalesce(v_pro, false);
  end if;

  -- Batas per menit: pengguna Pro/paket 3x lebih longgar (generate ulang & ganti soal beruntun).
  if v_pro then v_per_min := v_per_min * 3; end if;
  if (select count(*) from public.bgy_ai_usage
      where ip_hash = v_hash and tool = v_tool and created_at > now() - interval '1 minute') >= v_per_min then
    return 'rate';
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

-- Rollback: jalankan ulang bgy_ai_gate dari 20261028_paket_ma.sql.
