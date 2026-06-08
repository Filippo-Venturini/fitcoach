-- Dati giornalieri compilati dal cliente tramite app
-- Le metriche sono definite lato frontend come costanti (flessibile senza migrazioni)
create table daily_logs (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references profiles(id) on delete cascade,
  logged_date date not null,
  data        jsonb not null default '{}',
  created_at  timestamptz not null default now(),
  unique (client_id, logged_date)
);

create index on daily_logs (client_id, logged_date desc);

alter table daily_logs enable row level security;

-- Il PT vede i log di tutti i suoi clienti
create policy "pt can read all daily logs"
  on daily_logs for select
  using (
    exists (select 1 from profiles where id = auth.uid() and role = 'pt')
  );

-- Il cliente vede e gestisce solo i propri log
create policy "client can manage own daily logs"
  on daily_logs for all
  using (client_id = auth.uid())
  with check (client_id = auth.uid());
