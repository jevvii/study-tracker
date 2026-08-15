-- Study Tracker — Multi-Course migration (idempotent).
-- Apply with: supabase db execute --file supabase/migration_courses.sql
-- (or paste into the Supabase SQL editor). Safe to re-run.

-- ---------------------------------------------------------------------------
-- 1. courses
-- ---------------------------------------------------------------------------
create table if not exists courses (
  id            text primary key,
  title         text not null,
  description   text,
  emoji         text not null default '📚',
  color         text,
  owner_user_id uuid references auth.users(id) on delete set null,
  is_seed       boolean not null default false,
  notebook_url  text,
  source_count  int,
  created_at    timestamptz not null default now()
);

alter table courses enable row level security;
drop policy if exists "courses are readable by authenticated" on courses;
create policy "courses are readable by authenticated" on courses for select to authenticated using (true);
drop policy if exists "courses are writable by owner" on courses;
create policy "courses are writable by owner" on courses for all to authenticated
  using (owner_user_id = auth.uid()) with check (owner_user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 2. user_courses (enrollment + one active course per user)
-- ---------------------------------------------------------------------------
create table if not exists user_courses (
  user_id      uuid not null references auth.users(id) on delete cascade,
  course_id    text not null references courses(id) on delete cascade,
  enrolled_at  timestamptz not null default now(),
  is_active    boolean not null default false,
  primary key (user_id, course_id)
);
create unique index if not exists user_courses_one_active
  on user_courses(user_id) where is_active;

alter table user_courses enable row level security;
drop policy if exists "user_courses is own" on user_courses;
create policy "user_courses is own" on user_courses for all to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (select 1 from courses c
                where c.id = user_courses.course_id
                  and (c.is_seed or c.owner_user_id = auth.uid()))
  );

-- ---------------------------------------------------------------------------
-- 3. items.course_id + backfill + not-null
-- ---------------------------------------------------------------------------
alter table items add column if not exists course_id text references courses(id) on delete cascade;

-- Seed the shared SE course row first (needed by the FK + backfill).
insert into courses (id, title, description, emoji, is_seed, notebook_url)
values ('se-realworld', 'Software Engineering — Real-World Study Guide',
        'A tailored 12-week software engineering course.', '🛠️', true,
        'https://notebooklm.google.com/notebook/31e6db8c-9b66-4e80-8e4f-b643ac7082db')
on conflict (id) do update set
  title = excluded.title, description = excluded.description,
  emoji = excluded.emoji, is_seed = excluded.is_seed, notebook_url = excluded.notebook_url;

update items set course_id = 'se-realworld' where course_id is null and id like 'se-%';
-- All current items are se-* prefixed. If any other rows exist, backfill them
-- to a known course before the next line, or the set-not-null will fail.
do $$ begin
  alter table items alter column course_id set not null;
exception when not_null_violation then
  raise notice 'items.course_id still has nulls — backfill before retrying.';
end $$;

-- Replace the broad items select policy with a course-visibility check.
-- (Postgres ORs multiple permissive policies, so the old using(true) must go.)
drop policy if exists "items are readable by authenticated users" on items;
create policy "items are readable by course visibility" on items for select to authenticated
  using (exists (
    select 1 from courses c
    where c.id = items.course_id
      and ( c.owner_user_id is null
            or c.owner_user_id = auth.uid()
            or exists (select 1 from user_courses uc
                       where uc.user_id = auth.uid() and uc.course_id = c.id) )
  ));
drop policy if exists "items are writable by course owner" on items;
create policy "items are writable by course owner" on items for all to authenticated
  using (exists (select 1 from courses c
                 where c.id = items.course_id and c.owner_user_id = auth.uid()))
  with check (exists (select 1 from courses c
                      where c.id = items.course_id and c.owner_user_id = auth.uid()));

-- ---------------------------------------------------------------------------
-- 4. Auto-enroll new users in the seeded course (active by default)
-- ---------------------------------------------------------------------------
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into settings (user_id) values (new.id) on conflict (user_id) do nothing;
  insert into streaks (user_id) values (new.id) on conflict (user_id) do nothing;
  insert into user_courses (user_id, course_id, is_active)
    values (new.id, 'se-realworld', true)
    on conflict (user_id, course_id) do update set is_active = true;
  return new;
end; $$;

-- Re-bind in case the trigger already exists.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------------------------------------------------------------------------
-- 5. Backfill existing users: enroll everyone in the SE course, one active.
-- ---------------------------------------------------------------------------
insert into user_courses (user_id, course_id, is_active)
  select au.id, 'se-realworld', true
  from auth.users au
  where not exists (
    select 1 from user_courses uc where uc.user_id = au.id and uc.course_id = 'se-realworld'
  )
  on conflict (user_id, course_id) do nothing;

-- Ensure every existing user has exactly one active course; if none, activate SE.
insert into user_courses (user_id, course_id, is_active)
  select au.id, 'se-realworld', true
  from auth.users au
  where not exists (select 1 from user_courses uc where uc.user_id = au.id and uc.is_active)
  on conflict (user_id, course_id) do update set is_active = true;
