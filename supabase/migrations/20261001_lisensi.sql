-- Tab Pengguna & Tautan di admin.
-- Fungsi admin untuk melihat daftar pengguna (tabel users dari migrasi aktivasi).
-- bgy_settings key 'lisensi' diisi dari admin — tidak ada perubahan skema tabel.
-- Jalankan sekali di Supabase → SQL Editor. Aman dijalankan ulang.
begin;

create or replace function public.bgy_list_users(
  p_access text default null,
  p_limit  int  default 100,
  p_offset int  default 0
)
returns table(
  email       text,
  access      text,
  is_pro      boolean,
  plan_type   text,
  active_until timestamptz,
  purchased_at timestamptz,
  status      text
)
language plpgsql stable security definer set search_path = pg_catalog, public
as $$
declare
  v_limit  int := least(greatest(coalesce(p_limit, 100), 1), 500);
  v_offset int := greatest(coalesce(p_offset, 0), 0);
begin
  if not public.bgy_is_admin() then
    raise exception 'not admin';
  end if;
  return query
  select
    u.email,
    u.access,
    u.is_pro,
    u.plan_type,
    u.active_until,
    u.purchased_at,
    case
      when not u.is_pro                                                   then 'gratis'
      when u.plan_type = 'annual' and u.active_until < now()              then 'kedaluwarsa'
      else 'aktif'
    end as status
  from public.users u
  where p_access is null or u.access = p_access
  order by
    (u.is_pro) desc,
    (case when u.plan_type = 'annual' and u.active_until >= now() then 1 else 0 end) desc,
    coalesce(u.active_until, u.purchased_at) desc nulls last
  limit v_limit offset v_offset;
end;
$$;
revoke all on function public.bgy_list_users(text, int, int) from public;
grant execute on function public.bgy_list_users(text, int, int) to authenticated;

commit;
