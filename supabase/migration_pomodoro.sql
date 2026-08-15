-- Study Tracker — Configurable Pomodoro durations migration (idempotent).
-- Apply to your Supabase project:
--   supabase db execute --file supabase/migration_pomodoro.sql
-- or paste into the SQL editor. Safe to re-run: every statement guards existence.

-- ---------------------------------------------------------------------------
-- 1. Extend settings: configurable focus / short-break / long-break lengths
-- ---------------------------------------------------------------------------
alter table settings
  add column if not exists focus_minutes int not null default 25,
  add column if not exists short_break_minutes int not null default 5,
  add column if not exists long_break_minutes int not null default 15;

-- Backfill defaults for rows created before this migration.
update settings
  set focus_minutes = coalesce(focus_minutes, 25),
      short_break_minutes = coalesce(short_break_minutes, 5),
      long_break_minutes = coalesce(long_break_minutes, 15)
  where focus_minutes is null or short_break_minutes is null or long_break_minutes is null;