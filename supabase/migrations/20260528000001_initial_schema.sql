-- ============================================================
-- MIGRATION 001 — Schema iniziale FitCoach
-- ============================================================

-- ----------------------------------------------------------------
-- ENUM: ruoli utente
-- ----------------------------------------------------------------
create type user_role as enum ('pt', 'client');

-- ----------------------------------------------------------------
-- PROFILES
-- Estende auth.users. Creata automaticamente dal trigger sotto.
-- ----------------------------------------------------------------
create table profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  full_name    text,
  avatar_url   text,
  role         user_role not null default 'client',
  phone        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ----------------------------------------------------------------
-- EXERCISES_CATALOG
-- I ~300 esercizi fissi del PT, ognuno con ID video YouTube.
-- ----------------------------------------------------------------
create table exercises_catalog (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  youtube_id   text not null,           -- es. "dQw4w9WgXcQ"
  muscle_group text,                    -- es. "petto", "gambe", "schiena"
  description  text,
  created_at   timestamptz not null default now()
);

-- ----------------------------------------------------------------
-- WORKOUT_PLANS
-- Schede di allenamento assegnate a un cliente.
-- ----------------------------------------------------------------
create table workout_plans (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null references profiles(id) on delete cascade,
  name         text not null,
  notes        text,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ----------------------------------------------------------------
-- WORKOUT_EXERCISES
-- Esercizi all'interno di una scheda, ordinati.
-- ----------------------------------------------------------------
create table workout_exercises (
  id            uuid primary key default gen_random_uuid(),
  plan_id       uuid not null references workout_plans(id) on delete cascade,
  exercise_id   uuid not null references exercises_catalog(id),
  sets          int,
  reps          text,         -- flessibile: "8-10", "12", "AMRAP", "30s"
  rest_seconds  int,
  notes         text,
  order_index   int not null default 0
);

-- ----------------------------------------------------------------
-- DIET_PLANS
-- Diete in PDF assegnate a un cliente.
-- ----------------------------------------------------------------
create table diet_plans (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null references profiles(id) on delete cascade,
  name         text not null,
  pdf_url      text not null,           -- path nello storage Supabase
  notes        text,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now()
);

-- ----------------------------------------------------------------
-- PROGRESS_PHOTOS
-- Foto settimanali caricate dai clienti.
-- ----------------------------------------------------------------
create table progress_photos (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null references profiles(id) on delete cascade,
  photo_url    text not null,           -- path nello storage Supabase
  week_date    date not null,           -- lunedì della settimana di riferimento
  notes        text,
  created_at   timestamptz not null default now()
);

-- ----------------------------------------------------------------
-- TRIGGER: crea profilo automaticamente alla registrazione
-- ----------------------------------------------------------------
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'client')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ----------------------------------------------------------------
-- TRIGGER: aggiorna updated_at automaticamente
-- ----------------------------------------------------------------
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on profiles
  for each row execute procedure set_updated_at();

create trigger workout_plans_updated_at
  before update on workout_plans
  for each row execute procedure set_updated_at();

-- ----------------------------------------------------------------
-- INDICI utili
-- ----------------------------------------------------------------
create index on workout_plans (client_id);
create index on workout_plans (client_id, is_active);
create index on workout_exercises (plan_id, order_index);
create index on diet_plans (client_id);
create index on diet_plans (client_id, is_active);
create index on progress_photos (client_id, week_date desc);
create index on exercises_catalog (muscle_group);
