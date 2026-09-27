-- Dokumen Resmi (/dokumen): daftar dokumen kementerian yang diunggah admin dari /admin (tab Dokumen).
-- File disimpan di Supabase Storage bucket "dokumen" (publik, maks 50 MB) atau cukup link ke sumber resmi / Google Drive.
-- Jalankan sekali di Supabase → SQL Editor. Aman dijalankan ulang.
begin;

create table if not exists public.bgy_docs (
  id bigint generated always as identity primary key,
  title text not null check (char_length(title) between 3 and 200),
  nomor text check (nomor is null or char_length(nomor) <= 120),
  tahun smallint check (tahun is null or tahun between 1945 and 2100),
  kategori text not null default 'Lainnya' check (char_length(kategori) between 1 and 40),
  sumber text check (sumber is null or char_length(sumber) <= 120),
  sumber_url text check (sumber_url is null or (sumber_url ~* '^https://' and char_length(sumber_url) <= 500)),
  ringkasan text check (ringkasan is null or char_length(ringkasan) <= 1500),
  file_path text check (file_path is null or file_path ~ '^[A-Za-z0-9._/-]{1,200}$'),
  file_url text check (file_url is null or (file_url ~* '^https://' and char_length(file_url) <= 500)),
  file_name text check (file_name is null or char_length(file_name) <= 200),
  file_size bigint check (file_size is null or file_size >= 0),
  active boolean not null default true,
  downloads integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists bgy_docs_list_idx on public.bgy_docs (active, tahun desc, created_at desc);
alter table public.bgy_docs enable row level security;
revoke all on table public.bgy_docs from anon, authenticated;
grant select on table public.bgy_docs to anon, authenticated;
grant insert, update, delete on table public.bgy_docs to authenticated;

drop policy if exists docs_public_read on public.bgy_docs;
create policy docs_public_read on public.bgy_docs for select using (active or public.bgy_is_admin());
drop policy if exists docs_admin_write on public.bgy_docs;
create policy docs_admin_write on public.bgy_docs
  for all to authenticated using (public.bgy_is_admin()) with check (public.bgy_is_admin());

create or replace function public.bgy_doc_download(p_id bigint)
returns void
language sql security definer set search_path = pg_catalog, public
as $$
  update public.bgy_docs set downloads = downloads + 1 where id = p_id and active;
$$;
revoke all on function public.bgy_doc_download(bigint) from public;
grant execute on function public.bgy_doc_download(bigint) to anon, authenticated;

-- Tempat file: bucket publik "dokumen". Siapa saja bisa mengunduh, hanya admin yang bisa unggah/ubah/hapus.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('dokumen', 'dokumen', true, 52428800, array[
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/zip'
])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists dokumen_admin_insert on storage.objects;
create policy dokumen_admin_insert on storage.objects
  for insert to authenticated with check (bucket_id = 'dokumen' and public.bgy_is_admin());
drop policy if exists dokumen_admin_update on storage.objects;
create policy dokumen_admin_update on storage.objects
  for update to authenticated using (bucket_id = 'dokumen' and public.bgy_is_admin()) with check (bucket_id = 'dokumen' and public.bgy_is_admin());
drop policy if exists dokumen_admin_delete on storage.objects;
create policy dokumen_admin_delete on storage.objects
  for delete to authenticated using (bucket_id = 'dokumen' and public.bgy_is_admin());

commit;
