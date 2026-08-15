-- Study Tracker — Layout Redesign migration (idempotent).
-- Apply to your Supabase project (same workflow as migration.sql):
--   supabase db execute --file supabase/migration_redesign.sql
-- or paste into the SQL editor. Safe to re-run: every statement guards existence.

-- ---------------------------------------------------------------------------
-- 1. Extend settings: weekly hours target, starfield toggle, confetti toggle
-- ---------------------------------------------------------------------------
alter table settings
  add column if not exists weekly_target_minutes int not null default 600,
  add column if not exists starfield_on boolean not null default true,
  add column if not exists confetti_on boolean not null default true;

-- Backfill defaults for rows created before this migration.
update settings
  set weekly_target_minutes = coalesce(weekly_target_minutes, 600),
      starfield_on = coalesce(starfield_on, true),
      confetti_on = coalesce(confetti_on, true)
  where weekly_target_minutes is null or starfield_on is null or confetti_on is null;

-- Ensure new users get the same defaults.
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into settings (user_id) values (new.id)
    on conflict (user_id) do nothing;
  insert into streaks (user_id) values (new.id)
    on conflict (user_id) do nothing;
  return new;
end; $$;

-- ---------------------------------------------------------------------------
-- 2. Study journal
-- ---------------------------------------------------------------------------
create table if not exists journal_entries (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  date       date not null default current_date,
  body       text not null,
  mood       smallint check (mood between 1 and 5),
  item_id    text references items(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists journal_entries_user_date_idx
  on journal_entries(user_id, date desc);

alter table journal_entries enable row level security;
drop policy if exists "journal_entries is own" on journal_entries;
create policy "journal_entries is own" on journal_entries for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 3. Achievements catalog (readable by all authenticated; seeded once)
-- ---------------------------------------------------------------------------
do $$ begin
  create type achievement_category as enum ('milestone','streak','explorer','secret');
exception when duplicate_object then null; end $$;

create table if not exists achievements (
  id          text primary key,
  title       text not null,
  description text not null,
  icon        text not null,
  category    achievement_category not null
);

alter table achievements enable row level security;
drop policy if exists "achievements are readable by authenticated" on achievements;
create policy "achievements are readable by authenticated"
  on achievements for select to authenticated using (true);

insert into achievements (id, title, description, icon, category) values
  ('first_item',     'First Seed',        'Complete your first item.',            '🌱', 'milestone'),
  ('streak_7',       'On Fire',           'Reach a 7-day streak.',                 '🔥', 'streak'),
  ('streak_30',      'Eruption',          'Reach a 30-day streak.',                '🌋', 'streak'),
  ('all_books',      'Bookworm',          'Complete all resources of type book.',  '📚', 'explorer'),
  ('watch_10',       'Binge Learner',     'Watch 10 video resources.',            '🎬', 'explorer'),
  ('all_projects',   'Builder',           'Complete all projects.',                '🏗️', 'milestone'),
  ('all_topics',     'Brain Full',        'Complete all topics.',                  '🧠', 'milestone'),
  ('all_sections',   'Cartographer',      'Study items from every section.',       '🗺️', 'explorer'),
  ('century',        'Century',           'Log 100 total hours.',                  '⏱️', 'milestone'),
  ('night_owl',      'Night Owl',         'Log time after 11 PM.',                 '🌙', 'secret'),
  ('early_bird',     'Early Bird',        'Log time before 7 AM.',                 '🌅', 'secret'),
  ('dear_diary',     'Dear Diary',        'Write 10 journal entries.',             '📓', 'explorer')
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  icon = excluded.icon,
  category = excluded.category;

-- ---------------------------------------------------------------------------
-- 4. User achievement unlocks (own rows only)
-- ---------------------------------------------------------------------------
create table if not exists user_achievements (
  user_id         uuid not null references auth.users(id) on delete cascade,
  achievement_id  text not null references achievements(id) on delete cascade,
  unlocked_at     timestamptz not null default now(),
  primary key (user_id, achievement_id)
);
create index if not exists user_achievements_user_idx on user_achievements(user_id);

alter table user_achievements enable row level security;
drop policy if exists "user_achievements is own" on user_achievements;
create policy "user_achievements is own" on user_achievements for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());