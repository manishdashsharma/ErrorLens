# Integrating an app with ErrorLens

This walks through the full path: standing up a self-hosted ErrorLens
instance, registering a project, and wiring your app to report errors to
it. Every step below has been run for real, not just described.

## 1. Deploy ErrorLens

**On a VPS (production)** — `docker-compose.yml` runs the whole stack,
including the app itself, in one command:

```bash
git clone https://github.com/manishdashsharma/errorlens.git
cd errorlens
cp .env.example .env
# fill in ADMIN_SECRET, INNGEST_EVENT_KEY/INNGEST_SIGNING_KEY, and
# whichever of AI_API_KEY / GITHUB_TOKEN you want enrichment for —
# see .env.example for what each one unlocks and how to generate it
docker compose up -d
```

That's it — Postgres, Redis, self-hosted Inngest, and the ErrorLens app
all start together, migrations run automatically on container start, and
the app is reachable on port 3000.

**For local development** on this repo itself, run just the infra in
Docker and the app on the host with hot-reload — see `CONTRIBUTING.md`.

Confirm it's up:

```bash
curl http://localhost:3000/v1/health/ready
```

## 2. Create a project

Every service you want error tracking for is its own **project**, with
its own API key. `webhookUrl`/`webhookProvider` and
`githubOwner`/`githubRepo` are optional — leave them out if you don't
want alerts or git correlation yet, add them later with the same call.

```bash
curl -X POST http://localhost:3000/v1/projects \
  -H "x-admin-secret: $ADMIN_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "checkout-service",
    "webhookUrl": "https://discord.com/api/webhooks/...",
    "webhookProvider": "DISCORD",
    "githubOwner": "your-org",
    "githubRepo": "checkout-service"
  }'
```

The response includes an `apiKey.key` — copy it now, it's only ever shown
once. That's what your app authenticates with.

## 3. Install the SDK in your app

```bash
npm install errorlens-express
```

In your app's entry point:

```js
import { init, expressErrorHandler } from 'errorlens-express';

init({
  apiKey: process.env.ERRORLENS_API_KEY, // the key from step 2
  url: process.env.ERRORLENS_URL,        // where you deployed ErrorLens
});

// after all your routes
app.use(expressErrorHandler());
```

`init()` also attaches `uncaughtException`/`unhandledRejection` handlers
automatically — crashes outside the request/response cycle are captured
too, no extra wiring needed.

## 4. Verify it end-to-end

Trigger a real error in your app (hit a route that throws) and check it
landed:

```bash
curl "http://localhost:3000/v1/errors?projectId=<project-id>" \
  -H "x-admin-secret: $ADMIN_SECRET"
```

If `AI_API_KEY` is set, `aiAnalysis` fills in within a few seconds. If
`GITHUB_TOKEN` and the project's `githubOwner`/`githubRepo` are set,
`suspectCommit` fills in alongside it. If `webhookUrl` is set, the same
alert lands wherever you pointed it.

## What's optional vs required

| Capability | Requires |
|---|---|
| Error capture + dedup | Nothing beyond steps 1-3 |
| AI root-cause analysis | `AI_API_KEY` in ErrorLens's `.env` |
| Git commit correlation | `GITHUB_TOKEN` in `.env` + the project's `githubOwner`/`githubRepo` |
| Webhook alerts | `webhookUrl` + `webhookProvider` on the project |

Every enrichment step degrades gracefully when its requirement isn't
met — errors are still captured and queryable via the API either way.

## Managing errors day to day

```bash
# list, optionally filtered
curl "http://localhost:3000/v1/errors?status=NEW" -H "x-admin-secret: $ADMIN_SECRET"

# resolve or ignore
curl -X POST "http://localhost:3000/v1/errors/<id>/resolve" -H "x-admin-secret: $ADMIN_SECRET"
curl -X POST "http://localhost:3000/v1/errors/<id>/ignore" -H "x-admin-secret: $ADMIN_SECRET"
```

No dashboard in v1 — this is the complete surface.
