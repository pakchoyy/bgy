-- LKPD Pro jadi per semester: klaim pesanan LKPD (4 argumen) aktif 6 bulan, tool lain tetap 1 tahun.
-- Rollback: jalankan ulang bgy_claim_order (4 argumen) dari 20261025_keamanan_klaim.sql.
create or replace function public.bgy_claim_order(p_order text, p_sig text, p_email text, p_access text)
returns table (result text, activation_code text)
language plpgsql security definer set search_path = pg_catalog, public, extensions
as $$
declare
  v_order text := left(trim(coalesce(p_order, '')), 80);
  v_sig text := lower(trim(coalesce(p_sig, '')));
  v_email text := lower(trim(coalesce(p_email, '')));
  v_access text := lower(trim(coalesce(p_access, '')));
  v_durasi interval;
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
  v_durasi := case v_access when 'lkpd' then interval '6 months' else interval '1 year' end;

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
    -- Lifetime lama tidak diubah; selain itu aktif/diperpanjang dari tanggal terakhir yang lebih jauh.
    if not (v_user.is_pro and v_user.active_until is null) then
      update public.users u set is_pro = true, plan_type = 'annual', purchased_at = now(), code = v_code,
        active_until = greatest(coalesce(u.active_until, now()), now()) + v_durasi
      where lower(u.email) = v_email and u.access = v_access;
    end if;
  else
    v_code := 'BGY-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 5));
    insert into public.users (email, code, access, is_pro, plan_type, active_until, purchased_at)
    values (v_email, v_code, v_access, true, 'annual', now() + v_durasi, now());
  end if;

  insert into public.bgy_order_claims (order_id, email, access, code) values (v_order, v_email, v_access, v_code);
  return query select 'ok'::text, v_code;
end;
$$;
revoke all on function public.bgy_claim_order(text, text, text, text) from public;
grant execute on function public.bgy_claim_order(text, text, text, text) to anon, authenticated;
