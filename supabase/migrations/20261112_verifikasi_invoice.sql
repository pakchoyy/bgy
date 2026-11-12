-- Verifikasi invoice lewat QR: halaman publik /verifikasi/ memanggil fungsi ini dengan nomor + kode acak invoice.
-- Data invoice tetap di bgy_settings 'admin_invoices' (hanya admin). Fungsi ini hanya mengembalikan ringkasan
-- bila nomor DAN kode cocok, jadi orang lain tidak bisa menebak isi invoice.
create or replace function public.bgy_verify_invoice(p_no text, p_kode text)
returns table (no text, tanggal text, klien text, total numeric, dibayar numeric, status text, usaha text)
language sql stable security definer set search_path = pg_catalog, public
as $$
  select i->>'no', i->>'tanggal',
         -- nama klien disamarkan sebagian
         left(i->>'klien', 3) || repeat('*', greatest(length(i->>'klien') - 3, 0)),
         greatest(coalesce((select sum(coalesce((b->>'qty')::numeric, 1) * coalesce((b->>'harga')::numeric, 0))
                            from jsonb_array_elements(i->'baris') b), 0) - coalesce((i->>'diskon')::numeric, 0), 0),
         coalesce((i->>'dp')::numeric, 0),
         coalesce(i->>'status', 'belum'),
         coalesce(s.value->'profil'->>'nama', 'Pak Choy Kreacy Digital')
  from public.bgy_settings s, jsonb_array_elements(coalesce(s.value->'items', '[]'::jsonb)) i
  where s.key = 'admin_invoices'
    and length(coalesce(p_kode, '')) >= 10
    and i->>'no' = trim(p_no) and i->>'verif' = trim(p_kode)
  limit 1;
$$;
revoke all on function public.bgy_verify_invoice(text, text) from public;
grant execute on function public.bgy_verify_invoice(text, text) to anon, authenticated;

-- Rollback: drop function if exists public.bgy_verify_invoice(text, text);
