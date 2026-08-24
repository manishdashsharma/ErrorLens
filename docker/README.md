# Deploy ErrorLens with the prebuilt image

This is the fastest way to self-host ErrorLens — no need to clone the
whole repo or build anything. Every push to `main` publishes a new image
to GitHub Container Registry: `ghcr.io/manishdashsharma/errorlens`.

## 1. Download this folder

You only need three things from this directory:

- `docker-compose.yml`
- `.env.example`
- `inngest-init/001-create-inngest-db.sql`

```bash
mkdir errorlens && cd errorlens
curl -O https://raw.githubusercontent.com/manishdashsharma/ErrorLens/main/docker/docker-compose.yml
curl -O https://raw.githubusercontent.com/manishdashsharma/ErrorLens/main/docker/.env.example
mkdir inngest-init
curl -o inngest-init/001-create-inngest-db.sql https://raw.githubusercontent.com/manishdashsharma/ErrorLens/main/docker/inngest-init/001-create-inngest-db.sql
```

## 2. Configure

```bash
cp .env.example .env
```

Fill in `REDIS_PASSWORD`, `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`, and
`ADMIN_SECRET` at minimum. `GITHUB_TOKEN` and `AI_API_KEY` are optional —
leave them unset to skip git correlation / AI analysis.

## 3. Start the stack

```bash
docker compose up -d
```

Postgres, Redis, self-hosted Inngest, and the ErrorLens app all start
together. Migrations run automatically on container start.

## 4. Register the app with Inngest

Inngest doesn't know your app exists until you sync it once (and again
after any change to the running image):

```bash
curl -X PUT http://localhost:3000/api/inngest
```

## 5. Create your first project

```bash
curl -X POST http://localhost:3000/v1/projects \
  -H "x-admin-secret: $ADMIN_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"name": "my-service"}'
```

The response includes your project's API key — see the root
[INTEGRATION.md](../INTEGRATION.md) for wiring up the
[`errorlens-express`](https://www.npmjs.com/package/errorlens-express) SDK.

## Updating

```bash
docker compose pull app
docker compose up -d app
curl -X PUT http://localhost:3000/api/inngest
```

## Choosing a version

`docker-compose.yml` pins `ghcr.io/manishdashsharma/errorlens:latest` —
this always tracks the newest release, so `docker compose pull app`
picks up new features and fixes as soon as they ship.

If you don't want to keep pace with upstream and would rather stay on
whatever you deployed until you decide to move, pin a specific version
instead of `latest`. Edit the `image:` line under the `app` service in
your `docker-compose.yml`:

```yaml
app:
  image: ghcr.io/manishdashsharma/errorlens:1.0.0
```

With a pinned tag, `docker compose pull app` is a no-op forever — you
only move to a newer version by changing that line yourself, on your own
schedule. Check the [Releases](https://github.com/manishdashsharma/ErrorLens/releases)
page for available tags and what changed in each before you do.
