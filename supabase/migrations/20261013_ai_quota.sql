-- Batas pemakaian AI di sisi server (dipanggil oleh /api/generate-*).
-- 1. Rate limit per menit per IP, dihitung bersama untuk semua instance Vercel.
-- 2. Jatah harian pengguna gratis per IP; pengguna Pro (email langganan aktif) tanpa jatah harian.
-- IP disimpan sebagai hash md5, bukan IP asli. Data lebih dari 2 hari dibersihkan otomatis.
-- Jalankan sekali di Supabase → SQL Editor. Aman dijalankan ulang.
begin;

create table if not exists public.bgy_ai_usage (
  id bigserial primary key,
  tool text not null,
  ip_hash text not null,
  is_pro boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists bgy_ai_usage_ip_tool_time on public.bgy_ai_usage (ip_hash, tool, created_at);
alter table public.bgy_ai_usage enable row level security;
revoke all on table public.bgy_ai_usage from anon, authenticated;

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
  -- batas per tool: [panggilan per menit, panggilan gratis per hari]
  -- satu kali buat modul ajar = ±4-8 panggilan (bertahap + perbaikan), satu kali buat soal = 1-3 panggilan.
  if v_tool = 'soal' then v_per_min := 6; v_free_day := 15; v_access := 'soal';
  elsif v_tool = 'modul_ajar' then v_per_min := 12; v_free_day := 25; v_access := 'modul_ajar';
  elsif v_tool = 'teks' then v_per_min := 10; v_free_day := 20; v_access := null;
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

commit;
