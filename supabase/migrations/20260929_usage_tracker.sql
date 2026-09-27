-- Pelacak pemakaian anonim untuk tab Statistik di /admin.
-- Tiap browser punya ID acak (bgy_vid di localStorage); tidak ada nama, email, atau IP yang disimpan.
-- Jalankan sekali di Supabase → SQL Editor. Aman dijalankan ulang.
begin;

create table if not exists public.bgy_events (
  id bigint generated always as identity primary key,
  day date not null default ((now() at time zone 'Asia/Jakarta')::date),
  tool text not null check (tool ~ '^[a-z0-9-]{1,40}$'),
  event text not null check (event in ('open', 'hasil', 'pro', 'install', 'share')),
  vid uuid not null,
  created_at timestamptz not null default now()
);
create index if not exists bgy_events_day_idx on public.bgy_events (day, tool, event);
create index if not exists bgy_events_vid_day_idx on public.bgy_events (vid, day);
alter table public.bgy_events enable row level security;
revoke all on table public.bgy_events from anon, authenticated;

-- Catat satu kejadian (dibatasi 300 kejadian per browser per hari supaya tidak bisa dibanjiri).
create or replace function public.bgy_track(p_tool text, p_event text, p_vid uuid)
returns void
language plpgsql security definer set search_path = pg_catalog, public
as $$
declare
  v_tool text := lower(trim(coalesce(p_tool, '')));
  v_day date := (now() at time zone 'Asia/Jakarta')::date;
begin
  if v_tool !~ '^[a-z0-9-]{1,40}$' or p_event not in ('open', 'hasil', 'pro', 'install', 'share') or p_vid is null then
    return;
  end if;
  if (select count(*) from public.bgy_events where vid = p_vid and day = v_day) >= 300 then
    return;
  end if;
  insert into public.bgy_events (day, tool, event, vid) values (v_day, v_tool, p_event, p_vid);
end;
$$;
revoke all on function public.bgy_track(text, text, uuid) from public;
grant execute on function public.bgy_track(text, text, uuid) to anon, authenticated;

-- Ringkasan untuk admin saja.
create or replace function public.bgy_usage_stats(p_days int default 30)
returns jsonb
language plpgsql stable security definer set search_path = pg_catalog, public
as $$
declare
  v_days int := greatest(1, least(coalesce(p_days, 30), 365));
  v_today date := (now() at time zone 'Asia/Jakarta')::date;
  v_from date := v_today - (v_days - 1);
begin
  if not public.bgy_is_admin() then
    raise exception 'not admin';
  end if;
  return jsonb_build_object(
    'today', (select count(distinct vid) from public.bgy_events where day = v_today),
    'last7', (select count(distinct vid) from public.bgy_events where day > v_today - 7),
    'last30', (select count(distinct vid) from public.bgy_events where day > v_today - 30),
    'period', (select count(distinct vid) from public.bgy_events where day >= v_from),
    'daily', coalesce((
      select jsonb_agg(jsonb_build_object('day', d::date, 'guru', coalesce(x.guru, 0), 'hasil', coalesce(x.hasil, 0)) order by d)
      from generate_series(v_from, v_today, interval '1 day') d
      left join (
        select day, count(distinct vid) as guru, count(*) filter (where event = 'hasil') as hasil
        from public.bgy_events where day >= v_from group by day
      ) x on x.day = d::date
    ), '[]'::jsonb),
    'tools', coalesce((
      select jsonb_agg(t order by t.guru desc)
      from (
        select tool,
          count(distinct vid) as guru,
          count(*) filter (where event = 'open') as buka,
          count(*) filter (where event = 'hasil') as hasil,
          count(*) filter (where event = 'pro') as pro,
          count(*) filter (where event = 'install') as install,
          count(*) filter (where event = 'share') as share
        from public.bgy_events where day >= v_from group by tool
      ) t
    ), '[]'::jsonb)
  );
end;
$$;
revoke all on function public.bgy_usage_stats(int) from public;
grant execute on function public.bgy_usage_stats(int) to authenticated;

-- Opsional, jalankan sesekali untuk merapikan data lama (> 1 tahun):
-- delete from public.bgy_events where day < (now() at time zone 'Asia/Jakarta')::date - 365;

commit;
