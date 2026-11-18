#!/bin/sh
set -eu

until pg_isready -h "$PGHOST" -U "$PGUSER" -d "$PGDATABASE"; do
  sleep 1
done

psql -v ON_ERROR_STOP=1 <<'SQL'
create table if not exists schema_migrations (
  version text primary key,
  applied_at timestamptz not null default now()
);
SQL

for file in /migrations/*.sql; do
  version=$(basename "$file")
  already=$(psql -tA -c "select 1 from schema_migrations where version = '${version}'")
  if [ "$already" = "1" ]; then
    echo "already applied: $version"
    continue
  fi
  echo "applying: $version"
  psql -v ON_ERROR_STOP=1 --single-transaction -f "$file"
done
