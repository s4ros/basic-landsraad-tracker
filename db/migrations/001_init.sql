-- The version inserted below must match this filename.
-- db/migrate.sh runs this file inside a single transaction.

create table users (
  id uuid primary key default gen_random_uuid(),
  is_owner boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index users_one_owner on users ((true)) where is_owner;

create table identities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  provider text not null,
  provider_subject text not null,
  created_at timestamptz not null default now(),
  unique (provider, provider_subject)
);

create table worlds (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references users (id),
  created_at timestamptz not null default now(),
  check (char_length(btrim(name)) > 0)
);

create unique index worlds_name_lower on worlds (lower(name));

create table world_editors (
  world_id uuid not null references worlds (id) on delete cascade,
  user_id uuid not null references users (id) on delete cascade,
  appointed_by uuid not null references users (id),
  created_at timestamptz not null default now(),
  primary key (world_id, user_id)
);

create table weeks (
  id uuid primary key default gen_random_uuid(),
  world_id uuid not null references worlds (id) on delete cascade,
  sequence integer not null check (sequence > 0),
  status text not null check (status in ('open', 'closed')),
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  closed_by uuid references users (id),
  unique (world_id, sequence),
  check (
    (status = 'open' and closed_at is null)
    or (status = 'closed' and closed_at is not null)
  )
);

create unique index weeks_one_open_per_world on weeks (world_id) where status = 'open';

create table board_columns (
  week_id uuid not null references weeks (id) on delete cascade,
  position smallint not null check (position between 1 and 5),
  house_name text not null,
  primary key (week_id, position),
  check (char_length(btrim(house_name)) > 0)
);

create table board_cells (
  week_id uuid not null references weeks (id) on delete cascade,
  row smallint not null check (row between 1 and 5),
  column_position smallint not null check (column_position between 1 and 5),
  task_text text not null default '',
  primary key (week_id, row, column_position),
  foreign key (week_id, column_position) references board_columns (week_id, position)
);

create table house_claims (
  user_id uuid not null references users (id) on delete cascade,
  week_id uuid not null references weeks (id) on delete cascade,
  column_position smallint not null check (column_position between 1 and 5),
  worked boolean not null default false,
  claimed boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, week_id, column_position),
  foreign key (week_id, column_position) references board_columns (week_id, position)
);

insert into schema_migrations (version) values ('001_init.sql');
