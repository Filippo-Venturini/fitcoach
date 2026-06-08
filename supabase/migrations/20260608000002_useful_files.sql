-- ============================================================
-- MIGRATION — Useful Files
-- File utili caricati dal PT, scaricabili dai clienti
-- ============================================================

create table useful_files (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  file_path   text not null,
  file_size   bigint,
  mime_type   text,
  created_at  timestamptz not null default now()
);

alter table useful_files enable row level security;

-- Solo i PT possono vedere/gestire i file
create policy "pt can manage useful files"
  on useful_files for all
  using (
    exists (select 1 from profiles where id = auth.uid() and role = 'pt')
  )
  with check (
    exists (select 1 from profiles where id = auth.uid() and role = 'pt')
  );

-- I clienti autenticati possono leggere la lista
create policy "authenticated can read useful files"
  on useful_files for select
  using (auth.role() = 'authenticated');

-- ----------------------------------------------------------------
-- Bucket: useful-files
-- ----------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('useful-files', 'useful-files', false);

create policy "pt can upload useful files"
  on storage.objects for insert
  with check (
    bucket_id = 'useful-files' and
    exists (select 1 from profiles where id = auth.uid() and role = 'pt')
  );

create policy "pt can delete useful files"
  on storage.objects for delete
  using (
    bucket_id = 'useful-files' and
    exists (select 1 from profiles where id = auth.uid() and role = 'pt')
  );

create policy "authenticated can download useful files"
  on storage.objects for select
  using (
    bucket_id = 'useful-files' and
    auth.role() = 'authenticated'
  );
