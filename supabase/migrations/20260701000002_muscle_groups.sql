-- ============================================================
-- MIGRATION — Rimappatura gruppi muscolari
-- Nuovo set canonico di 12 gruppi:
--   Petto, Centro Schiena, Dorsale, Spalle, Spalla Posteriore,
--   Bicipiti, Tricipiti, Quadricipiti, Femorali, Glutei,
--   Addome, Stabilizzatori
--
-- Gli esercizi attuali sono dati mock: rimappatura best-effort
-- dai vecchi gruppi (Petto, Bicipiti, Schiena, Tricipiti, Spalle,
-- Gambe, Addominali, Tutto il corpo) ai nuovi.
-- ============================================================

update exercises_catalog
set muscle_group = case lower(trim(muscle_group))
  when 'petto'          then 'Petto'
  when 'bicipiti'       then 'Bicipiti'
  when 'tricipiti'      then 'Tricipiti'
  when 'spalle'         then 'Spalle'
  when 'addominali'     then 'Addome'
  when 'addome'         then 'Addome'
  when 'schiena'        then 'Dorsale'
  when 'gambe'          then 'Quadricipiti'
  when 'tutto il corpo' then 'Stabilizzatori'
  else muscle_group      -- lascia invariati eventuali valori già nel nuovo set
end
where muscle_group is not null;
