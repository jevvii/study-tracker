-- Study Tracker — Weekly review reflections (one per user per Manila week).
-- Apply to your Supabase project:
--   supabase db execute --file supabase/migration_weekly_reviews.sql
-- or paste into the SQL editor. Safe to re-run: every statement guards existence.
--
-- The weekly review *stats* (hours, items done, mood trend) are derived on the fly
-- from time_logs / progress / journal_entries, so they are not stored here. Only the
-- user's free-text reflection for a given week is persisted — one row per user per
-- week, keyed by the Manila Monday date of that week (week_start).

create table if not exists weekly_reviews (
  user_id    uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  reflection text not null default '',
  updated_at timestamptz not null default now(),
  primary key (user_id, week_start)
);

alter table weekly_reviews enable row level security;
drop policy if exists "weekly_reviews is own" on weekly_reviews;
create policy "weekly_reviews is own" on weekly_reviews for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());