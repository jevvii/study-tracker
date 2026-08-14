create type track_t as enum ('plan','project','topic','resource');
create type progress_status as enum ('not_started','in_progress','done');
create type theme_pref as enum ('dark','light','system');

create table items (
  id text primary key,
  track track_t not null,
  sort_order int not null,
  title text not null,
  description text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id text not null references items(id) on delete cascade,
  status progress_status not null default 'not_started',
  completed_at timestamptz,
  notes text,
  updated_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

create table time_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  minutes int not null check (minutes > 0),
  item_id text references items(id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);

create table streaks (
  user_id uuid primary key references auth.users(id) on delete cascade,
  current_streak int not null default 0,
  longest_streak int not null default 0,
  last_active_date date
);

create table settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  theme theme_pref not null default 'dark',
  reduce_motion boolean not null default false
);

-- RLS
alter table progress enable row level security;
alter table time_logs enable row level security;
alter table streaks enable row level security;
alter table settings enable row level security;
alter table items enable row level security;

create policy "items are readable by authenticated users"
  on items for select to authenticated using (true);

create policy "progress is own" on progress for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "time_logs is own" on time_logs for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "streaks is own" on streaks for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "settings is own" on settings for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- bootstrap settings + streaks on signup
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into settings (user_id) values (new.id);
  insert into streaks (user_id) values (new.id);
  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
