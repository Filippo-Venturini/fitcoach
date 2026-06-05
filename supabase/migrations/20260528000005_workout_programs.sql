-- ============================================================
-- MIGRATION 005 — Workout Programs (cicli di allenamento)
-- ============================================================

-- ----------------------------------------------------------------
-- WORKOUT_PROGRAMS
-- Un "programma" raggruppa più schede (A, B, C...) tutte attive
-- assieme. Quando si crea un nuovo programma, il precedente
-- diventa storico (is_active = false).
-- ----------------------------------------------------------------
create table workout_programs (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references profiles(id) on delete cascade,
  name        text,                           -- es. "Forza Fase 2", opzionale
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- Lega le schede esistenti al programma
alter table workout_plans
  add column program_id uuid references workout_programs(id) on delete cascade;

-- Carico per ogni esercizio (es. "80kg", "70% 1RM", "BW")
alter table workout_exercises
  add column carico text;

-- Indici
create index on workout_programs (client_id);
create index on workout_programs (client_id, is_active);
create index on workout_plans (program_id);

-- ----------------------------------------------------------------
-- RLS per workout_programs
-- ----------------------------------------------------------------
alter table workout_programs enable row level security;

create policy "pt can manage all programs"
  on workout_programs for all
  using (is_pt());

create policy "clients can view own programs"
  on workout_programs for select
  using (client_id = auth.uid());
