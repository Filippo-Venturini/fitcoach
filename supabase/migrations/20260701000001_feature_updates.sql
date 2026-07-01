-- ============================================================
-- MIGRATION — Feature updates (luglio 2026)
--   1. Categoria sui file utili
--   2. Cadenza sugli esercizi della scheda
--   3. Note settimanali nella raccolta dati
-- ============================================================

-- ----------------------------------------------------------------
-- 1. USEFUL_FILES: categoria
--    Sezioni: Allenamento, Nutrizione, Privacy, Ricettario
-- ----------------------------------------------------------------
alter table useful_files
  add column if not exists category text not null default 'Allenamento';

-- ----------------------------------------------------------------
-- 2. WORKOUT_EXERCISES: cadenza
--    Campo testuale libero per la cadenza dell'esercizio
--    (es. "2 volte a settimana", "1010", "esplosiva")
-- ----------------------------------------------------------------
alter table workout_exercises
  add column if not exists cadenza text;

-- ----------------------------------------------------------------
-- 3. WEEKLY_NOTES: note testuali riferite a una settimana
--    week_start = lunedì della settimana di riferimento
-- ----------------------------------------------------------------
create table if not exists weekly_notes (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references profiles(id) on delete cascade,
  week_start  date not null,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (client_id, week_start)
);

create index if not exists weekly_notes_client_week_idx
  on weekly_notes (client_id, week_start desc);

alter table weekly_notes enable row level security;

-- Il PT gestisce le note di tutti i suoi clienti
create policy "pt can manage all weekly notes"
  on weekly_notes for all
  using (is_pt())
  with check (is_pt());

-- Il cliente vede e gestisce solo le proprie note
create policy "client can manage own weekly notes"
  on weekly_notes for all
  using (client_id = auth.uid())
  with check (client_id = auth.uid());

-- Aggiorna updated_at automaticamente
create trigger weekly_notes_updated_at
  before update on weekly_notes
  for each row execute procedure set_updated_at();
