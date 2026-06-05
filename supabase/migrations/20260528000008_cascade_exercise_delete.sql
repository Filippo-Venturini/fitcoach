-- Migration 008 — Cascade delete da exercises_catalog a workout_exercises
-- Quando si elimina un esercizio dal catalogo, viene rimosso anche da tutte le schede.

alter table workout_exercises
  drop constraint workout_exercises_exercise_id_fkey;

alter table workout_exercises
  add constraint workout_exercises_exercise_id_fkey
  foreign key (exercise_id) references exercises_catalog(id) on delete cascade;
