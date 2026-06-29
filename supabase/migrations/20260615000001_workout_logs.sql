-- Reps effettive del cliente sull'esercizio della scheda
alter table workout_exercises add column actual_reps text;

-- Il cliente può aggiornare actual_reps sugli esercizi delle proprie schede
create policy "clients can update actual_reps on own workout exercises"
  on workout_exercises for update
  using (
    exists (
      select 1 from workout_plans
      where workout_plans.id = workout_exercises.plan_id
        and workout_plans.client_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from workout_plans
      where workout_plans.id = workout_exercises.plan_id
        and workout_plans.client_id = auth.uid()
    )
  );
