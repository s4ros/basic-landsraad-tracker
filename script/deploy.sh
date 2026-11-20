#!/bin/sh
# Build the web image from HEAD and run it on infinigy.pl.
# The server does not compile Next.js. See deploy/PRODUCTION.md.
set -eu

remote=infinigy.pl
remote_dir=/opt/www/landsraad
public_host=${PUBLIC_HOST:-dune.s4ros.it}
ssh="ssh -o BatchMode=yes -o ClearAllForwardings=yes -o ServerAliveInterval=30"
scp="scp -o BatchMode=yes -o ClearAllForwardings=yes"

cd "$(dirname "$0")/.."

case $public_host in
  ""|*/*|*:*|*[[:space:]]*)
    echo "PUBLIC_HOST must be a bare hostname." >&2
    exit 1
    ;;
esac

git fetch origin master
local_sha=$(git rev-parse HEAD)
origin_sha=$(git rev-parse origin/master)
if [ "$local_sha" != "$origin_sha" ]; then
  echo "HEAD is not origin/master ($local_sha vs $origin_sha)." >&2
  echo "Push master before deploying." >&2
  exit 1
fi

short=$(git rev-parse --short HEAD)
echo "Building landsraad-web:$short from $local_sha"
git archive --format=tar HEAD | docker build -t landsraad-web:current -t "landsraad-web:$short" -

echo "Sending image to $remote"
docker save landsraad-web:current "landsraad-web:$short" | $ssh "$remote" docker load

echo "Updating $remote_dir"
$ssh "$remote" "sudo mkdir -p '$remote_dir' && sudo chown ubuntu:ubuntu '$remote_dir'"
$ssh "$remote" "bash -s" << EOF
set -eu
if [ ! -d '$remote_dir/.git' ]; then
  git clone git@github.com:s4ros/basic-landsraad-tracker.git '$remote_dir'
fi
cd '$remote_dir'
git fetch origin
git checkout --detach '$local_sha'
EOF

if $ssh "$remote" "test -f '$remote_dir/.env'"; then
  echo "Server env file already exists"
else
  echo "Creating server env file"
  tmp=$(mktemp)
  chmod 600 "$tmp"
  trap 'rm -f "$tmp"' EXIT
  password=$(openssl rand -hex 24)
  secret=$(openssl rand -base64 32 | tr -d '\n')
  printf 'PUBLIC_HOST=%s\nPOSTGRES_PASSWORD=%s\nAUTH_SECRET=%s\n' \
    "$public_host" "$password" "$secret" > "$tmp"
  $scp "$tmp" "$remote:$remote_dir/.env"
  rm -f "$tmp"
  $ssh "$remote" "chmod 600 '$remote_dir/.env'"
fi

echo "Starting stack"
# Migrate is one-shot. Recreate it on every deploy so a new SQL file runs,
# then wait for it before the web container starts.
$ssh "$remote" "bash -s" << EOF
set -eu
cd '$remote_dir'
docker compose -f compose.prod.yaml up -d db
docker compose -f compose.prod.yaml up -d --force-recreate --no-deps migrate
code=\$(docker wait landsraad-migrate)
if [ "\$code" != "0" ]; then
  docker logs landsraad-migrate
  exit 1
fi
docker compose -f compose.prod.yaml up -d web
mkdir -p '$remote_dir/backups'
chmod 700 '$remote_dir/backups'
line='15 4 * * * docker exec landsraad-db pg_dump -U landsraad --no-owner landsraad | gzip > /opt/www/landsraad/backups/landsraad-\$(date +\%F).sql.gz && find /opt/www/landsraad/backups -name "landsraad-*.sql.gz" -mtime +7 -delete'
if crontab -l 2>/dev/null | grep -F 'landsraad-db pg_dump' >/dev/null; then
  echo "cron already present"
else
  (crontab -l 2>/dev/null || true; printf '%s\n' "\$line") | crontab -
  echo "cron installed"
fi
EOF

echo "Deployed $local_sha"
