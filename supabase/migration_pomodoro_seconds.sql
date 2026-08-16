-- Study Tracker — Pomodoro durations in seconds (supersedes migration_pomodoro.sql).
-- Apply to your Supabase project:
--   supabase db execute --file supabase/migration_pomodoro_seconds.sql
-- or paste into the SQL editor. Safe to re-run: every statement guards existence.
--
-- The duration editor now sets Hours:Minutes:Seconds, so durations need
-- second-level granularity. The legacy focus_minutes / short_break_minutes /
-- long_break_minutes columns stored whole minutes and cannot represent seconds;
-- they are replaced by *_seconds columns. This migration is self-sufficient —
-- it works whether or not migration_pomodoro.sql was ever applied.

-- ---------------------------------------------------------------------------
-- 1. Add second-granularity duration columns
-- ---------------------------------------------------------------------------
alter table settings
  add column if not exists focus_seconds int not null default 1500,
  add column if not exists short_break_seconds int not null default 300,
  add column if not exists long_break_seconds int not null default 900;

-- ---------------------------------------------------------------------------
-- 2. Backfill from the legacy minute columns (1 minute = 60 seconds), but only
--    if they still exist. Re-running after they are dropped is a no-op.
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'settings' and column_name = 'focus_minutes'
  ) then
    update settings
      set focus_seconds        = focus_minutes * 60,
          short_break_seconds  = short_break_minutes * 60,
          long_break_seconds   = long_break_minutes * 60;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 3. Drop the superseded minute columns
-- ---------------------------------------------------------------------------
alter table settings
  drop column if exists focus_minutes,
  drop column if exists short_break_minutes,
  drop column if exists long_break_minutes;