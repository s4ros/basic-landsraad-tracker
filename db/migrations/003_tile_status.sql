-- The version inserted below must match this filename.
-- The owner sets one shared color per house tile: idle (gray), ready (gold), collected (green).

drop table house_claims;

alter table board_cells
  add column status text not null default 'idle'
  check (status in ('idle', 'ready', 'collected'));

insert into schema_migrations (version) values ('003_tile_status.sql');
