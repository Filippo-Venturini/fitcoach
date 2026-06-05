-- Migration 007 — Rimuove week_date da progress_photos (ridondante con created_at)
alter table progress_photos drop column if exists week_date;
