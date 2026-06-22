create table if not exists trips (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  location text,
  start_date date,
  end_date date,
  join_code text unique not null,
  lodging_name text,
  lodging_address text,
  total_points numeric default 18,
  winning_number numeric default 9.5,
  retain_number numeric default 9,
  defending_team text,
  created_at timestamptz default now()
);

create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references trips(id) on delete cascade,
  name text not null,
  code text not null check (code in ('A', 'B'))
);

create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references trips(id) on delete cascade,
  team_id uuid references teams(id) on delete set null,
  display_name text not null,
  handicap_index numeric,
  player_code text
);

create table if not exists courses (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references trips(id) on delete cascade,
  name text not null,
  location text,
  address text,
  par int,
  course_rating numeric,
  slope int,
  image_url text,
  notes text
);

create table if not exists rounds (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references trips(id) on delete cascade,
  course_id uuid references courses(id) on delete set null,
  round_number int,
  round_date date,
  date_label text,
  format text not null,
  points_available numeric,
  arrival_time text
);

create table if not exists tee_times (
  id uuid primary key default gen_random_uuid(),
  round_id uuid references rounds(id) on delete cascade,
  tee_time text,
  sort_order int
);

create table if not exists tee_time_players (
  tee_time_id uuid references tee_times(id) on delete cascade,
  player_id uuid references players(id) on delete cascade,
  primary key (tee_time_id, player_id)
);

create table if not exists matches (
  id uuid primary key default gen_random_uuid(),
  round_id uuid references rounds(id) on delete cascade,
  label text,
  points numeric,
  match_type text
);

create table if not exists match_players (
  match_id uuid references matches(id) on delete cascade,
  player_id uuid references players(id) on delete cascade,
  side text not null check (side in ('A', 'B')),
  primary key (match_id, player_id)
);

create table if not exists score_entries (
  id uuid primary key default gen_random_uuid(),
  round_id uuid references rounds(id) on delete cascade,
  player_id uuid references players(id) on delete cascade,
  gross_score int not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(round_id, player_id)
);
