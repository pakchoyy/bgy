-- Kunci public.users dan pindahkan alur PRO ke RPC tervalidasi.
-- Tidak ada data user yang diubah atau dihapus oleh migrasi ini.
begin;

alter table public.users enable row level security;

do $$
declare policy_row record;
begin
  for policy_row in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'users'
  loop
    execute format('drop policy if exists %I on public.users', policy_row.policyname);
  end loop;
end
$$;

revoke all on table public.users from anon, authenticated;

create or replace function public.bgy_subscription_status(p_email text, p_access text)
returns table (is_pro boolean, plan_type text, active_until timestamptz)
language plpgsql security definer set search_path = pg_catalog, public
as $$
declare
  normalized_email text := lower(trim(p_email));
  normalized_access text := lower(trim(p_access));
begin
  if normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
     or normalized_access not in ('soal', 'modul_ajar', 'kokurikuler') then return; end if;
  return query select u.is_pro, u.plan_type, u.active_until
  from public.users u
  where lower(u.email) = normalized_email and u.access = normalized_access limit 1;
end;
$$;

create or replace function public.bgy_request_activation_code(p_email text, p_access text)
returns table (result text, activation_code text)
language plpgsql security definer set search_path = pg_catalog, public
as $$
declare
  normalized_email text := lower(trim(p_email));
  normalized_access text := lower(trim(p_access));
  user_row record;
  generated_code text;
begin
  if normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
     or normalized_access not in ('soal', 'modul_ajar', 'kokurikuler') then
    return query select 'invalid'::text, null::text; return;
  end if;

  select u.is_pro, u.code into user_row from public.users u
  where lower(u.email) = normalized_email and u.access = normalized_access limit 1;
  if found then
    if user_row.is_pro then return query select 'already_pro'::text, null::text;
    else return query select 'pending'::text, user_row.code::text; end if;
    return;
  end if;

  generated_code := 'BGY-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 5));
  begin
    insert into public.users (email, code, access, is_pro, plan_type, active_until, purchased_at)
    values (normalized_email, generated_code, normalized_access, false, null, null, null);
  exception when unique_violation then
    select u.is_pro, u.code into user_row from public.users u
    where lower(u.email) = normalized_email and u.access = normalized_access limit 1;
    if user_row.is_pro then return query select 'already_pro'::text, null::text;
    else return query select 'pending'::text, user_row.code::text; end if;
    return;
  end;
  return query select 'created'::text, generated_code;
end;
$$;

create or replace function public.bgy_activate_pro(p_email text, p_code text, p_access text)
returns table (result text, is_pro boolean, plan_type text, active_until timestamptz)
language plpgsql security definer set search_path = pg_catalog, public
as $$
declare
  normalized_email text := lower(trim(p_email));
  normalized_code text := upper(trim(p_code));
  normalized_access text := lower(trim(p_access));
  user_row record;
begin
  if normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
     or normalized_code !~ '^BGY-[A-Z0-9]{5}$'
     or normalized_access not in ('soal', 'modul_ajar', 'kokurikuler') then
    return query select 'invalid'::text, false, null::text, null::timestamptz; return;
  end if;

  select u.id, u.is_pro, u.plan_type, u.active_until into user_row
  from public.users u
  where lower(u.email) = normalized_email and upper(u.code) = normalized_code
    and u.access = normalized_access limit 1 for update;
  if not found then
    return query select 'invalid'::text, false, null::text, null::timestamptz; return;
  end if;

  -- Legacy lifetime: active_until null tidak pernah dianggap expired.
  if user_row.is_pro and user_row.plan_type is distinct from 'annual' then
    return query select 'active'::text, true, user_row.plan_type::text, user_row.active_until::timestamptz; return;
  end if;
  if user_row.is_pro and user_row.plan_type = 'annual' and user_row.active_until > now() then
    return query select 'active'::text, true, 'annual'::text, user_row.active_until::timestamptz; return;
  end if;
  if user_row.is_pro and user_row.plan_type = 'annual' then
    return query select 'expired'::text, true, 'annual'::text, user_row.active_until::timestamptz; return;
  end if;

  if not user_row.is_pro and user_row.plan_type is null then
    update public.users u set is_pro = true, plan_type = 'annual', purchased_at = now(),
      active_until = now() + interval '1 year'
    where u.id = user_row.id
    returning u.is_pro, u.plan_type, u.active_until
      into user_row.is_pro, user_row.plan_type, user_row.active_until;
    return query select 'activated'::text, user_row.is_pro, user_row.plan_type::text,
      user_row.active_until::timestamptz; return;
  end if;

  return query select 'inactive'::text, false, user_row.plan_type::text, user_row.active_until::timestamptz;
end;
$$;

revoke all on function public.bgy_subscription_status(text, text) from public;
revoke all on function public.bgy_request_activation_code(text, text) from public;
revoke all on function public.bgy_activate_pro(text, text, text) from public;
grant execute on function public.bgy_subscription_status(text, text) to anon, authenticated;
grant execute on function public.bgy_request_activation_code(text, text) to anon, authenticated;
grant execute on function public.bgy_activate_pro(text, text, text) to anon, authenticated;

commit;
