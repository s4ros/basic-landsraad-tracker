-- The version inserted below must match this filename.
-- A week is a 5×5 grid. Each cell is one Landsraad house, as on the in-game board.
-- Hurata, Mutelli, and Richese complete the set: they are the houses whose tiles
-- were covered on the reference screenshot, so their names were not readable there.

create table houses (
  id smallint primary key,
  name text not null,
  check (char_length(btrim(name)) > 0)
);

create unique index houses_name_lower on houses (lower(name));

insert into houses (id, name) values
  (1, 'Imota'),
  (2, 'Moritani'),
  (3, 'Thorvald'),
  (4, 'Alexin'),
  (5, 'Wydras'),
  (6, 'Kenola'),
  (7, 'Ecaz'),
  (8, 'Wallach'),
  (9, 'Sor'),
  (10, 'Dyvetz'),
  (11, 'Maros'),
  (12, 'Argosaz'),
  (13, 'Novebruns'),
  (14, 'Spinnette'),
  (15, 'Wayku'),
  (16, 'Taligari'),
  (17, 'Lindaren'),
  (18, 'Vernius'),
  (19, 'Tseida'),
  (20, 'Varota'),
  (21, 'Mikarrol'),
  (22, 'Hagal'),
  (23, 'Hurata'),
  (24, 'Mutelli'),
  (25, 'Richese');

drop table house_claims;
drop table board_cells;
drop table board_columns;

create table board_cells (
  week_id uuid not null references weeks (id) on delete cascade,
  row smallint not null check (row between 1 and 5),
  column_position smallint not null check (column_position between 1 and 5),
  house_id smallint references houses (id),
  primary key (week_id, row, column_position),
  unique (week_id, house_id)
);

create table house_claims (
  user_id uuid not null references users (id) on delete cascade,
  week_id uuid not null references weeks (id) on delete cascade,
  house_id smallint not null references houses (id),
  worked boolean not null default false,
  claimed boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, week_id, house_id),
  foreign key (week_id, house_id) references board_cells (week_id, house_id)
);

insert into schema_migrations (version) values ('002_house_grid.sql');
