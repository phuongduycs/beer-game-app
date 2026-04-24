-- Supabase Postgres schema cho Beer Game IUH
-- Chạy: paste vào Supabase SQL Editor rồi Run

create table if not exists games (
  room_code    text primary key,
  status       text not null default 'lobby',  -- lobby | running | ended
  week         int  not null default 0,
  total_weeks  int  not null default 30,
  demand       jsonb not null default '[]'::jsonb,  -- mảng demand từng tuần
  chain_a      jsonb,  -- snapshot chainState A
  chain_b      jsonb,  -- snapshot chainState B
  created_at   timestamptz not null default now(),
  ended_at     timestamptz
);

create table if not exists players (
  id           text primary key,  -- socket id hoặc uuid
  room_code    text not null references games(room_code) on delete cascade,
  name         text not null,
  chain        text not null check (chain in ('A','B')),
  role         text not null check (role in ('retailer','wholesaler','distributor','factory')),
  is_captain   boolean not null default false,
  online       boolean not null default true,
  joined_at    timestamptz not null default now()
);

create table if not exists week_events (
  id           bigserial primary key,
  room_code    text not null references games(room_code) on delete cascade,
  week         int  not null,
  chain        text not null,
  role         text not null,
  event_type   text not null,   -- 'suggest' | 'submit' | 'captain_changed'
  player_id    text,
  payload      jsonb,
  at           timestamptz not null default now()
);

create table if not exists chat_messages (
  id           bigserial primary key,
  room_code    text not null references games(room_code) on delete cascade,
  chain        text not null,
  role         text not null,
  player_id    text not null,
  player_name  text not null,
  text         text not null,
  at           timestamptz not null default now()
);

create index if not exists idx_players_room on players(room_code);
create index if not exists idx_events_room_week on week_events(room_code, week);
create index if not exists idx_chat_room on chat_messages(room_code);
