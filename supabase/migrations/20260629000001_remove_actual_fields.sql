-- Rimuove actual_sets e actual_reps da workout_exercises
-- e la relativa policy RLS

drop policy if exists "clients can update actual_reps on own workout exercises" on workout_exercises;

alter table workout_exercises drop column if exists actual_sets;
alter table workout_exercises drop column if exists actual_reps;
