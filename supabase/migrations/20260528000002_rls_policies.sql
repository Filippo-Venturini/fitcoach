-- ============================================================
-- MIGRATION 002 — Row Level Security (RLS)
-- ============================================================
-- Logica:
--   • Il PT (role = 'pt') ha accesso completo a tutti i dati
--   • Il client vede/modifica solo i propri dati
--   • Il catalogo esercizi è leggibile da tutti gli utenti autenticati
-- ============================================================

-- ----------------------------------------------------------------
-- Helper functions
-- ----------------------------------------------------------------

-- Restituisce true se l'utente corrente è il PT
create or replace function is_pt()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'pt'
  );
$$;

-- ----------------------------------------------------------------
-- PROFILES
-- ----------------------------------------------------------------
alter table profiles enable row level security;

-- Il PT vede tutti i profili
create policy "pt can view all profiles"
  on profiles for select
  using (is_pt());

-- Il PT può aggiornare tutti i profili (es. modificare nome cliente)
create policy "pt can update all profiles"
  on profiles for update
  using (is_pt());

-- Ogni utente vede il proprio profilo
create policy "users can view own profile"
  on profiles for select
  using (auth.uid() = id);

-- Ogni utente aggiorna il proprio profilo
create policy "users can update own profile"
  on profiles for update
  using (auth.uid() = id);

-- ----------------------------------------------------------------
-- EXERCISES_CATALOG
-- ----------------------------------------------------------------
alter table exercises_catalog enable row level security;

-- Tutti gli autenticati possono leggere il catalogo
create policy "authenticated users can view catalog"
  on exercises_catalog for select
  using (auth.role() = 'authenticated');

-- Solo il PT può scrivere sul catalogo
create policy "pt can manage catalog"
  on exercises_catalog for all
  using (is_pt());

-- ----------------------------------------------------------------
-- WORKOUT_PLANS
-- ----------------------------------------------------------------
alter table workout_plans enable row level security;

-- PT: accesso completo
create policy "pt can manage all workout plans"
  on workout_plans for all
  using (is_pt());

-- Client: solo lettura delle proprie schede
create policy "clients can view own workout plans"
  on workout_plans for select
  using (client_id = auth.uid());

-- ----------------------------------------------------------------
-- WORKOUT_EXERCISES
-- ----------------------------------------------------------------
alter table workout_exercises enable row level security;

-- PT: accesso completo
create policy "pt can manage all workout exercises"
  on workout_exercises for all
  using (is_pt());

-- Client: legge solo gli esercizi delle proprie schede
create policy "clients can view own workout exercises"
  on workout_exercises for select
  using (
    exists (
      select 1 from workout_plans
      where workout_plans.id = workout_exercises.plan_id
        and workout_plans.client_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------
-- DIET_PLANS
-- ----------------------------------------------------------------
alter table diet_plans enable row level security;

-- PT: accesso completo
create policy "pt can manage all diet plans"
  on diet_plans for all
  using (is_pt());

-- Client: solo lettura delle proprie diete
create policy "clients can view own diet plans"
  on diet_plans for select
  using (client_id = auth.uid());

-- ----------------------------------------------------------------
-- PROGRESS_PHOTOS
-- ----------------------------------------------------------------
alter table progress_photos enable row level security;

-- PT: può vedere tutte le foto
create policy "pt can view all progress photos"
  on progress_photos for select
  using (is_pt());

-- Client: inserisce e vede solo le proprie foto
create policy "clients can insert own progress photos"
  on progress_photos for insert
  with check (client_id = auth.uid());

create policy "clients can view own progress photos"
  on progress_photos for select
  using (client_id = auth.uid());

-- Client: può eliminare le proprie foto
create policy "clients can delete own progress photos"
  on progress_photos for delete
  using (client_id = auth.uid());
