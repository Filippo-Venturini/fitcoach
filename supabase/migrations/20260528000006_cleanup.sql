-- Migration 006 — Cleanup: rimuove avatar_url da profiles
alter table profiles drop column if exists avatar_url;
