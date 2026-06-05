-- ============================================================
-- MIGRATION 003 — Storage Buckets e Policy
-- ============================================================

-- ----------------------------------------------------------------
-- Bucket: diet-pdfs
-- PDF delle diete caricate dal PT, scaricabili dai clienti
-- ----------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('diet-pdfs', 'diet-pdfs', false);

-- PT può caricare/eliminare PDF
create policy "pt can upload diet pdfs"
  on storage.objects for insert
  with check (
    bucket_id = 'diet-pdfs' and
    exists (
      select 1 from profiles
      where id = auth.uid() and role = 'pt'
    )
  );

create policy "pt can delete diet pdfs"
  on storage.objects for delete
  using (
    bucket_id = 'diet-pdfs' and
    exists (
      select 1 from profiles
      where id = auth.uid() and role = 'pt'
    )
  );

-- Tutti gli autenticati possono scaricare (il cliente verifica
-- tramite RLS su diet_plans se ha accesso al PDF)
create policy "authenticated users can download diet pdfs"
  on storage.objects for select
  using (
    bucket_id = 'diet-pdfs' and
    auth.role() = 'authenticated'
  );

-- ----------------------------------------------------------------
-- Bucket: progress-photos
-- Foto settimanali caricate dai clienti
-- ----------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('progress-photos', 'progress-photos', false);

-- Ogni client carica nella propria cartella: {user_id}/filename
create policy "clients can upload own progress photos"
  on storage.objects for insert
  with check (
    bucket_id = 'progress-photos' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Ogni client vede solo le proprie foto
create policy "clients can view own progress photos"
  on storage.objects for select
  using (
    bucket_id = 'progress-photos' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Ogni client elimina solo le proprie foto
create policy "clients can delete own progress photos"
  on storage.objects for delete
  using (
    bucket_id = 'progress-photos' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Il PT vede tutte le foto progress
create policy "pt can view all progress photos"
  on storage.objects for select
  using (
    bucket_id = 'progress-photos' and
    exists (
      select 1 from profiles
      where id = auth.uid() and role = 'pt'
    )
  );
