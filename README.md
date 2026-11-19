# Landsraad Tracker

Unofficial fan tool for tracking Landsraad reward claims in Dune: Awakening.

## Run

Docker is required.

```sh
docker compose up --build
```

The site is at http://localhost:3000. On startup, Postgres applies the SQL files in `db/migrations`.

Copy `.env.example` to `.env` and set `AUTH_SECRET` (`openssl rand -base64 32`). Compose passes that file to the web service. The database user and password in `docker-compose.yml` are for this local stack only.

Sign in at `/konto`. Steam uses OpenID and needs no API key. The return URL is `http://localhost:3000/api/auth/steam/callback`. Google is optional: create an OAuth client, set the redirect URI to `http://localhost:3000/api/auth/callback/google`, then set `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET`.

The first account that signs in becomes the application owner. Later accounts do not. Both providers are identities of one account, and a second provider is linked only while you are already signed in. A week is a 5×5 grid of houses. Each tile is gray until an editor marks the reward ready (gold) or collected (green). The live board is at `/tablica`. A placed house shows its mark from `public/houses/` above the name on the open board and on a closed week. An empty cell has no mark. An editor closes the week when the game resets. The closed board stays at `/tablica/<world>/tydzien/<sequence>`, and the current board starts empty. The landing page still shows an example.

Not affiliated with Funcom, Legendary, or the owners of the Dune trademark.
