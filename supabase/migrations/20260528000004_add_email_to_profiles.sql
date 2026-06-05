-- ============================================================
-- MIGRATION 004 — Aggiunge email a profiles + fix trigger
-- ============================================================

-- Aggiungi colonna email
alter table profiles add column if not exists email text;

-- Aggiorna il trigger per salvare anche l'email
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', null),
    new.email,
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'client')
  )
  on conflict (id) do update
    set email = excluded.email;
  return new;
end;
$$;

-- Backfill email per gli utenti già esistenti
-- (richiede che auth.users sia accessibile, eseguire come service_role)
update profiles p
set email = u.email
from auth.users u
where p.id = u.id and p.email is null;

-- Rendi i bucket pubblici (path con UUID non guessabili, ok per MVP)
update storage.buckets set public = true where id in ('diet-pdfs', 'progress-photos');
