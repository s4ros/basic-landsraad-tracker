# Produkcja

Strona stoi na `ssh infinigy.pl`, w katalogu `/opt/www/landsraad`. Publiczny host jest w `/opt/www/landsraad/.env` jako `PUBLIC_HOST`. Przy pierwszym wdrożeniu jest to `dune.s4ros.it`, więc adres to `https://dune.s4ros.it`.

Traefik na tym serwerze kończy TLS i kieruje ruch. Aplikacja i Postgres nie publikują portów na hoście. Obraz web buduje się na maszynie, z której uruchamiasz skrypt. Serwer go tylko uruchamia.

## Wdrożenie

Na `master`, po pushu:

```sh
script/deploy.sh
```

Inny host przy pierwszym tworzeniu pliku `.env`:

```sh
PUBLIC_HOST=przyklad.s4ros.it script/deploy.sh
```

Skrypt buduje obraz z `HEAD`, wysyła go na serwer, robi checkout tego samego commita i podnosi stos. Istniejącego `.env` nie nadpisuje. Hasła nie wypisuje.

Kolejne wdrożenie to ten sam skrypt po pushu na `master`.

## Zmiana subdomeny

1. W Cloudflare dodaj proxied rekord A nowej nazwy na ten sam origin co reszta `s4ros.it`.
2. Na serwerze zmień `PUBLIC_HOST` w `/opt/www/landsraad/.env`.
3. Uruchom `docker compose -f compose.prod.yaml up -d` w tym katalogu. Obrazu nie trzeba budować ponownie.

Stary host przestaje mieć router. Steam bierze adres zwrotny z `AUTH_URL`. Ludzie logują się ponownie, bo ciasteczko jest przypisane do dokładnego hosta. Google, jeśli zostanie włączone, wymaga w konsoli Google adresu `https://<PUBLIC_HOST>/api/auth/callback/google`.

## Google

Przy starcie Google jest wyłączone. Żeby je włączyć, dopisz `AUTH_GOOGLE_ID` i `AUTH_GOOGLE_SECRET` do serwerowego `.env`, dodaj adres zwrotny w konsoli Google i uruchom `docker compose -f compose.prod.yaml up -d`.

## Kopia bazy

Cron użytkownika `ubuntu` o 04:15 robi `pg_dump` do `/opt/www/landsraad/backups/` i kasuje pliki starsze niż 7 dni. Hasło bazy nie jest w crontabie.

Odtworzenie do bazy kontrolnej:

```sh
docker exec landsraad-db psql -U landsraad -d postgres -c 'create database landsraad_restore_check'
gunzip -c /opt/www/landsraad/backups/landsraad-RRRR-MM-DD.sql.gz | docker exec -i landsraad-db psql -U landsraad -d landsraad_restore_check
docker exec landsraad-db psql -U landsraad -d postgres -c 'drop database landsraad_restore_check'
```

## Cofnięcie obrazu

Wolumen `pgdata` zostaje. Na serwerze:

```sh
docker tag landsraad-web:<stary-sha> landsraad-web:current
cd /opt/www/landsraad
docker compose -f compose.prod.yaml up -d web
```

Checkout w katalogu musi pasować do migracji z tego obrazu.
