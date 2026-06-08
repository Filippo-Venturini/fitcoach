-- Impostazioni globali della piattaforma (una riga per chiave)
create table app_settings (
  key   text primary key,
  value text
);

alter table app_settings enable row level security;

-- Tutti i PT autenticati possono leggere e modificare
create policy "authenticated can read app_settings"
  on app_settings for select
  using (auth.role() = 'authenticated');

create policy "pt can update app_settings"
  on app_settings for update
  using (
    exists (select 1 from profiles where id = auth.uid() and role = 'pt')
  );

-- Valore iniziale
insert into app_settings (key, value) values ('questionnaire_form_url', null);

-- Rimuove il campo specifico per PT (ora è globale)
alter table profiles drop column if exists questionnaire_form_url;
