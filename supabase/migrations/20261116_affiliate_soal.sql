-- Program Affiliate Buat Soal (otomatis).
-- Member PRO (tier 'pro' atau lisensi lama tanpa tier) mendapat kode BS-XXXXX lewat bgy_aff_me (email + kode aktivasi).
-- Pembeli paket memasukkan kode saat aktivasi (aktvs-bs.html) -> bgy_aff_apply: komisi ke pemilik kode, bonus hari ke pembeli.
-- Angka di bgy_settings key 'paket_soal' -> affiliate: komisi, min_cair, jadwal, bonus_hari.
-- Penarikan: member minta lewat bgy_aff_withdraw, admin proses di /admin lewat bgy_aff_payout_set.
-- Aman dijalankan ulang.
begin;

create table if not exists public.bgy_aff (
  code text primary key,
  email text not null unique,
  dana text,
  saldo integer not null default 0 check (saldo >= 0),
  total integer not null default 0,
  cair integer not null default 0,
  ref_count integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.bgy_aff_ref (
  order_id text primary key,
  code text not null references public.bgy_aff(code),
  buyer_email text not null,
  komisi integer not null,
  bonus_hari integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists bgy_aff_ref_code on public.bgy_aff_ref (code, created_at desc);

create table if not exists public.bgy_aff_payout (
  id bigserial primary key,
  code text not null references public.bgy_aff(code),
  email text not null,
  amount integer not null check (amount > 0),
  dana text not null,
  status text not null default 'menunggu' check (status in ('menunggu', 'dibayar', 'ditolak')),
  note text,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);
create index if not exists bgy_aff_payout_status on public.bgy_aff_payout (status, created_at desc);
create unique index if not exists bgy_aff_payout_one_pending on public.bgy_aff_payout (code) where status = 'menunggu';

alter table public.bgy_aff enable row level security;
alter table public.bgy_aff_ref enable row level security;
alter table public.bgy_aff_payout enable row level security;
revoke all on table public.bgy_aff, public.bgy_aff_ref, public.bgy_aff_payout from anon, authenticated;
grant select on table public.bgy_aff, public.bgy_aff_ref, public.bgy_aff_payout to authenticated;
drop policy if exists aff_admin_read on public.bgy_aff;
create policy aff_admin_read on public.bgy_aff for select to authenticated using (public.bgy_is_admin());
drop policy if exists aff_ref_admin_read on public.bgy_aff_ref;
create policy aff_ref_admin_read on public.bgy_aff_ref for select to authenticated using (public.bgy_is_admin());
drop policy if exists aff_payout_admin_read on public.bgy_aff_payout;
create policy aff_payout_admin_read on public.bgy_aff_payout for select to authenticated using (public.bgy_is_admin());

-- Angka program dari pengaturan admin (dengan nilai bawaan).
create or replace function public.bgy_aff_cfg()
returns table (komisi int, min_cair int, bonus_hari int, jadwal text)
language sql stable security definer set search_path = pg_catalog, public
as $$
  select
    coalesce(nullif(s.value -> 'affiliate' ->> 'komisi', '')::int, 3000),
    coalesce(nullif(s.value -> 'affiliate' ->> 'min_cair', '')::int, 20000),
    least(greatest(coalesce(nullif(s.value -> 'affiliate' ->> 'bonus_hari', '')::int, 7), 0), 60),
    coalesce(nullif(s.value -> 'affiliate' ->> 'jadwal', ''), 'tiap tanggal 1 lewat DANA')
  from (select 1) x left join public.bgy_settings s on s.key = 'paket_soal';
$$;
revoke all on function public.bgy_aff_cfg() from public;

-- Member PRO Buat Soal yang masih aktif (PLUS tidak termasuk).
create or replace function public.bgy_aff_is_pro(p_email text)
returns boolean
language sql stable security definer set search_path = pg_catalog, public
as $$
  select exists (
    select 1 from public.users u
    where lower(u.email) = lower(trim(p_email)) and u.access = 'soal' and u.is_pro
      and (u.active_until is null or u.active_until > now())
      and (u.tier is null or u.tier = 'pro')
  );
$$;
revoke all on function public.bgy_aff_is_pro(text) from public;

-- Dasbor member: butuh email + kode aktivasi BGY-XXXXX supaya saldo tidak bisa diintip orang lain.
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
    loop
      v_new := 'BS-' || upper(substr(translate(encode(extensions.gen_random_bytes(8), 'base64'), '+/=0O1IL', ''), 1, 5));
      exit when length(v_new) = 8 and not exists (select 1 from public.bgy_aff where code = v_new);
    end loop;
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

-- Pengajuan penarikan seluruh saldo ke nomor DANA.
create or replace function public.bgy_aff_withdraw(p_email text, p_code text, p_dana text)
returns text
language plpgsql security definer set search_path = pg_catalog, public
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_code text := upper(trim(coalesce(p_code, '')));
  v_dana text := regexp_replace(coalesce(p_dana, ''), '[^0-9]', '', 'g');
  v_aff public.bgy_aff;
  v_min int;
begin
  if not exists (select 1 from public.users u where lower(u.email) = v_email and upper(u.code) = v_code and u.access = 'soal') then
    return 'invalid';
  end if;
  if v_dana !~ '^0?8[0-9]{8,12}$' and v_dana !~ '^628[0-9]{8,12}$' then return 'bad_dana'; end if;
  select * into v_aff from public.bgy_aff where email = v_email for update;
  if not found then return 'invalid'; end if;
  if exists (select 1 from public.bgy_aff_payout where code = v_aff.code and status = 'menunggu') then return 'pending'; end if;
  select min_cair into v_min from public.bgy_aff_cfg();
  if v_aff.saldo < greatest(v_min, 1) then return 'kurang'; end if;
  insert into public.bgy_aff_payout (code, email, amount, dana) values (v_aff.code, v_email, v_aff.saldo, v_dana);
  update public.bgy_aff set saldo = 0, dana = v_dana where code = v_aff.code;
  return 'ok';
end;
$$;
revoke all on function public.bgy_aff_withdraw(text, text, text) from public;
grant execute on function public.bgy_aff_withdraw(text, text, text) to anon, authenticated;

-- Dipanggil halaman aktivasi setelah bgy_claim_order berhasil. Link pesanan (sig) membuktikan pesanan asli,
-- satu pesanan hanya bisa memakai satu kode, dan pemilik kode tidak bisa memakai kodenya sendiri.
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
  if v_order = '' or v_sig !~ '^[0-9a-f]{64}$' or v_ref !~ '^BS-[A-Z0-9]{5}$' then
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

-- Admin: tandai penarikan dibayar atau ditolak (ditolak = saldo dikembalikan).
create or replace function public.bgy_aff_payout_set(p_id bigint, p_status text, p_note text default null)
returns text
language plpgsql security definer set search_path = pg_catalog, public
as $$
declare
  v_p public.bgy_aff_payout;
begin
  if not public.bgy_is_admin() then return 'forbidden'; end if;
  if p_status not in ('dibayar', 'ditolak') then return 'invalid'; end if;
  select * into v_p from public.bgy_aff_payout where id = p_id for update;
  if not found or v_p.status <> 'menunggu' then return 'invalid'; end if;
  update public.bgy_aff_payout set status = p_status, note = left(p_note, 200), processed_at = now() where id = p_id;
  if p_status = 'dibayar' then
    update public.bgy_aff set cair = cair + v_p.amount where code = v_p.code;
  else
    update public.bgy_aff set saldo = saldo + v_p.amount where code = v_p.code;
  end if;
  return 'ok';
end;
$$;
revoke all on function public.bgy_aff_payout_set(bigint, text, text) from public;
grant execute on function public.bgy_aff_payout_set(bigint, text, text) to authenticated;

-- Admin: kode aktivasi pengguna (untuk membantu member yang lupa kode).
create or replace function public.bgy_admin_user_codes(p_access text default null)
returns table (email text, access text, code text)
language plpgsql stable security definer set search_path = pg_catalog, public
as $$
begin
  if not public.bgy_is_admin() then raise exception 'not admin'; end if;
  return query select lower(u.email)::text, u.access::text, u.code::text from public.users u
    where u.code is not null and (p_access is null or u.access = p_access);
end;
$$;
revoke all on function public.bgy_admin_user_codes(text) from public;
grant execute on function public.bgy_admin_user_codes(text) to authenticated;

commit;

-- ═══ Rollback (manual) ═══
-- drop function if exists public.bgy_admin_user_codes(text);
-- drop function if exists public.bgy_aff_payout_set(bigint, text, text);
-- drop function if exists public.bgy_aff_apply(text, text, text);
-- drop function if exists public.bgy_aff_withdraw(text, text, text);
-- drop function if exists public.bgy_aff_me(text, text);
-- drop function if exists public.bgy_aff_is_pro(text);
-- drop function if exists public.bgy_aff_cfg();
-- drop table if exists public.bgy_aff_payout, public.bgy_aff_ref, public.bgy_aff;
