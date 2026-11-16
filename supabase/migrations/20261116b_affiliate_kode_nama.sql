-- Kode affiliate memakai nama (dari email), misalnya INDAH, INDAH2. Member boleh mengganti kodenya
-- selama belum dipakai siapa pun. Kode lama format BS-XXXXX tetap sah. Aman dijalankan ulang.
begin;

-- Ganti kode ikut memperbarui riwayat referal & penarikan.
alter table public.bgy_aff_ref drop constraint if exists bgy_aff_ref_code_fkey;
alter table public.bgy_aff_ref add constraint bgy_aff_ref_code_fkey foreign key (code) references public.bgy_aff(code) on update cascade;
alter table public.bgy_aff_payout drop constraint if exists bgy_aff_payout_code_fkey;
alter table public.bgy_aff_payout add constraint bgy_aff_payout_code_fkey foreign key (code) references public.bgy_aff(code) on update cascade;

-- Kode dari bagian depan email: huruf saja, maks 8 huruf (indahrahmadani21@... -> INDAHRAH). Bentrok -> tambah angka.
create or replace function public.bgy_aff_kode_baru(p_email text)
returns text
language plpgsql security definer set search_path = pg_catalog, public
as $$
declare
  v_base text := upper(regexp_replace(split_part(lower(coalesce(p_email, '')), '@', 1), '[^a-z]', '', 'g'));
  v_kode text;
  n int := 1;
begin
  v_base := left(v_base, 8);
  if length(v_base) < 3 or v_base like 'BGY%' then v_base := 'GURU'; end if;
  v_kode := v_base;
  while exists (select 1 from public.bgy_aff where code = v_kode) loop
    n := n + 1;
    v_kode := v_base || n;
  end loop;
  return v_kode;
end;
$$;
revoke all on function public.bgy_aff_kode_baru(text) from public, anon, authenticated;

create or replace function public.bgy_aff_auto(p_email text)
returns jsonb
language plpgsql security definer set search_path = pg_catalog, public
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_aff public.bgy_aff;
  v_cfg record;
  v_new text;
  v_pending int;
  v_refs jsonb;
begin
  if v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then return jsonb_build_object('result', 'invalid'); end if;
  select * into v_aff from public.bgy_aff where email = v_email;
  if not found then
    if not public.bgy_aff_is_pro(v_email) then return jsonb_build_object('result', 'not_pro'); end if;
    v_new := public.bgy_aff_kode_baru(v_email);
    insert into public.bgy_aff (code, email) values (v_new, v_email) returning * into v_aff;
  end if;
  select * into v_cfg from public.bgy_aff_cfg();
  select coalesce(sum(amount), 0) into v_pending from public.bgy_aff_payout where code = v_aff.code and status = 'menunggu';
  select coalesce(jsonb_agg(jsonb_build_object('tgl', r.created_at, 'komisi', r.komisi) order by r.created_at desc), '[]'::jsonb)
    into v_refs from (select created_at, komisi from public.bgy_aff_ref where code = v_aff.code order by created_at desc limit 20) r;
  return jsonb_build_object('result', 'ok', 'code', v_aff.code, 'saldo', v_aff.saldo, 'total', v_aff.total, 'cair', v_aff.cair,
    'ref_count', v_aff.ref_count,
    'dana', case when v_aff.dana is null then null else left(v_aff.dana, 4) || repeat('*', greatest(length(v_aff.dana) - 7, 0)) || right(v_aff.dana, 3) end,
    'dana_kunci', v_aff.dana is not null, 'pending', v_pending, 'pro', public.bgy_aff_is_pro(v_email),
    'komisi', v_cfg.komisi, 'min_cair', v_cfg.min_cair, 'bonus_hari', v_cfg.bonus_hari, 'jadwal', v_cfg.jadwal, 'refs', v_refs);
end;
$$;
revoke all on function public.bgy_aff_auto(text) from public;
grant execute on function public.bgy_aff_auto(text) to anon, authenticated;
revoke all on function public.bgy_aff_auto(text) from public;
grant execute on function public.bgy_aff_auto(text) to anon, authenticated;

create or replace function public.bgy_aff_me(p_email text, p_code text)
returns jsonb
language plpgsql security definer set search_path = pg_catalog, public
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_code text := upper(trim(coalesce(p_code, '')));
  v_aff public.bgy_aff;
  v_cfg record;
  v_new text;
  v_pending int;
  v_refs jsonb;
begin
  if v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or v_code !~ '^BGY-[A-Z0-9]{5}$'
     or not exists (select 1 from public.users u where lower(u.email) = v_email and upper(u.code) = v_code and u.access = 'soal') then
    return jsonb_build_object('result', 'invalid');
  end if;
  select * into v_aff from public.bgy_aff where email = v_email;
  if not found then
    if not public.bgy_aff_is_pro(v_email) then return jsonb_build_object('result', 'not_pro'); end if;
    v_new := public.bgy_aff_kode_baru(v_email);
    insert into public.bgy_aff (code, email) values (v_new, v_email) returning * into v_aff;
  end if;
  select * into v_cfg from public.bgy_aff_cfg();
  select coalesce(sum(amount), 0) into v_pending from public.bgy_aff_payout where code = v_aff.code and status = 'menunggu';
  select coalesce(jsonb_agg(jsonb_build_object('tgl', r.created_at, 'komisi', r.komisi) order by r.created_at desc), '[]'::jsonb)
    into v_refs from (select created_at, komisi from public.bgy_aff_ref where code = v_aff.code order by created_at desc limit 20) r;
  return jsonb_build_object('result', 'ok', 'code', v_aff.code, 'saldo', v_aff.saldo, 'total', v_aff.total, 'cair', v_aff.cair,
    'ref_count', v_aff.ref_count, 'dana', v_aff.dana, 'pending', v_pending, 'pro', public.bgy_aff_is_pro(v_email),
    'komisi', v_cfg.komisi, 'min_cair', v_cfg.min_cair, 'bonus_hari', v_cfg.bonus_hari, 'jadwal', v_cfg.jadwal, 'refs', v_refs);
end;
$$;
revoke all on function public.bgy_aff_me(text, text) from public;
grant execute on function public.bgy_aff_me(text, text) to anon, authenticated;
revoke all on function public.bgy_aff_me(text, text) from public;
grant execute on function public.bgy_aff_me(text, text) to anon, authenticated;

create or replace function public.bgy_aff_apply(p_order text, p_sig text, p_ref text)
returns jsonb
language plpgsql security definer set search_path = pg_catalog, public, extensions
as $$
declare
  v_order text := left(trim(coalesce(p_order, '')), 80);
  v_sig text := lower(trim(coalesce(p_sig, '')));
  v_ref text := upper(trim(coalesce(p_ref, '')));
  v_secret text;
  v_claim record;
  v_aff public.bgy_aff;
  v_cfg record;
begin
  if v_order = '' or v_sig !~ '^[0-9a-f]{64}$' or v_ref !~ '^[A-Z0-9][A-Z0-9-]{2,14}$' then
    return jsonb_build_object('result', 'invalid');
  end if;
  select value into v_secret from public.bgy_private where key = 'klaim_hmac_secret';
  if v_secret is null or v_sig <> encode(extensions.hmac(v_order, v_secret, 'sha256'), 'hex') then
    return jsonb_build_object('result', 'invalid');
  end if;
  select * into v_claim from public.bgy_order_claims where order_id = v_order;
  if not found or v_claim.access <> 'soal' then return jsonb_build_object('result', 'invalid'); end if;
  if exists (select 1 from public.bgy_aff_ref where order_id = v_order) then return jsonb_build_object('result', 'used'); end if;
  select * into v_aff from public.bgy_aff where code = v_ref for update;
  if not found then return jsonb_build_object('result', 'no_code'); end if;
  if v_aff.email = lower(v_claim.email) then return jsonb_build_object('result', 'self'); end if;
  if not public.bgy_aff_is_pro(v_aff.email) then return jsonb_build_object('result', 'no_code'); end if;
  select * into v_cfg from public.bgy_aff_cfg();

  insert into public.bgy_aff_ref (order_id, code, buyer_email, komisi, bonus_hari)
  values (v_order, v_aff.code, lower(v_claim.email), v_cfg.komisi, v_cfg.bonus_hari);
  update public.bgy_aff set saldo = saldo + v_cfg.komisi, total = total + v_cfg.komisi, ref_count = ref_count + 1
  where code = v_aff.code;
  if v_cfg.bonus_hari > 0 then
    update public.users u set active_until = u.active_until + make_interval(days => v_cfg.bonus_hari)
    where lower(u.email) = lower(v_claim.email) and u.access = 'soal' and u.active_until is not null;
  end if;
  return jsonb_build_object('result', 'ok', 'bonus_hari', v_cfg.bonus_hari);
end;
$$;
revoke all on function public.bgy_aff_apply(text, text, text) from public;
grant execute on function public.bgy_aff_apply(text, text, text) to anon, authenticated;
revoke all on function public.bgy_aff_apply(text, text, text) from public;
grant execute on function public.bgy_aff_apply(text, text, text) to anon, authenticated;

create or replace function public.bgy_aff_credit(p_order text, p_ref text)
returns jsonb
language plpgsql security definer set search_path = pg_catalog, public
as $$
declare
  v_ref text := upper(trim(coalesce(p_ref, '')));
  v_claim record;
  v_aff public.bgy_aff;
  v_cfg record;
begin
  if v_ref !~ '^[A-Z0-9][A-Z0-9-]{2,14}$' then return jsonb_build_object('result', 'no_code'); end if;
  select * into v_claim from public.bgy_order_claims where order_id = p_order;
  if not found or v_claim.access <> 'soal' then return jsonb_build_object('result', 'invalid'); end if;
  if exists (select 1 from public.bgy_aff_ref where order_id = p_order) then return jsonb_build_object('result', 'used'); end if;
  select * into v_aff from public.bgy_aff where code = v_ref for update;
  if not found then return jsonb_build_object('result', 'no_code'); end if;
  if v_aff.email = lower(v_claim.email) then return jsonb_build_object('result', 'self'); end if;
  if not public.bgy_aff_is_pro(v_aff.email) then return jsonb_build_object('result', 'no_code'); end if;
  select * into v_cfg from public.bgy_aff_cfg();
  insert into public.bgy_aff_ref (order_id, code, buyer_email, komisi, bonus_hari)
  values (p_order, v_aff.code, lower(v_claim.email), v_cfg.komisi, v_cfg.bonus_hari);
  update public.bgy_aff set saldo = saldo + v_cfg.komisi, total = total + v_cfg.komisi, ref_count = ref_count + 1
  where code = v_aff.code;
  if v_cfg.bonus_hari > 0 then
    update public.users u set active_until = u.active_until + make_interval(days => v_cfg.bonus_hari)
    where lower(u.email) = lower(v_claim.email) and u.access = 'soal' and u.active_until is not null;
  end if;
  return jsonb_build_object('result', 'ok', 'bonus_hari', v_cfg.bonus_hari);
end;
$$;
revoke all on function public.bgy_aff_credit(text, text) from public, anon, authenticated;
revoke all on function public.bgy_aff_credit(text, text) from public, anon, authenticated;

-- Member mengganti kode sendiri: 3-12 huruf/angka, belum dipakai orang, dan kode lama belum pernah dipakai pembeli.
create or replace function public.bgy_aff_ganti_kode(p_email text, p_kode text)
returns text
language plpgsql security definer set search_path = pg_catalog, public
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_kode text := upper(regexp_replace(coalesce(p_kode, ''), '[^A-Za-z0-9]', '', 'g'));
  v_aff public.bgy_aff;
begin
  if v_kode !~ '^[A-Z0-9]{3,12}$' or v_kode like 'BGY%' then return 'format'; end if;
  select * into v_aff from public.bgy_aff where email = v_email for update;
  if not found then return 'invalid'; end if;
  if v_aff.code = v_kode then return 'ok'; end if;
  if v_aff.ref_count > 0 then return 'terpakai'; end if;
  if exists (select 1 from public.bgy_aff where code = v_kode) then return 'ada'; end if;
  update public.bgy_aff set code = v_kode where email = v_email;
  return 'ok';
end;
$$;
revoke all on function public.bgy_aff_ganti_kode(text, text) from public;
grant execute on function public.bgy_aff_ganti_kode(text, text) to anon, authenticated;

commit;

-- ═══ Rollback (manual) ═══
-- drop function if exists public.bgy_aff_ganti_kode(text, text);
-- jalankan ulang bgy_aff_auto, bgy_aff_me, bgy_aff_apply, bgy_aff_credit dari 20261116_affiliate_soal.sql;
-- drop function if exists public.bgy_aff_kode_baru(text);
