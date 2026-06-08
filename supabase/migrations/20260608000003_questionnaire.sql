-- Flag: il PT ha richiesto la compilazione del questionario da parte del cliente
alter table profiles
  add column if not exists questionnaire_pending boolean not null default false;

-- URL del Google Form configurato dal PT (salvato sul profilo del PT)
alter table profiles
  add column if not exists questionnaire_form_url text;
