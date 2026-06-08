alter table workout_programs add column if not exists expires_at date;
alter table diet_plans       add column if not exists expires_at date;
