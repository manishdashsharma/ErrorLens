# ErrorLens

Self-hosted, AI-native error tracking for Node/Express apps. Open source,
self-hosted — a company deploys one instance, creates a project per service,
gets an API key per project. No dashboard in v1: SDK + API + webhook only.

This file only covers what's specific to ErrorLens. General Node/Express/
Prisma/Redis style rules already live in the global CLAUDE.md — this file
does not repeat them, it extends them where this project differs or adds
constraints of its own.

## Engineering standard

Build and review every change the way a 10-year senior SDE and system
architect would — this is meant to be a portfolio-quality open-source
project, not a prototype. In practice: think through scale and failure
modes before writing the happy path, prefer the boring proven approach
over the clever one, don't ship a half-finished endpoint or an unindexed
query "for now," and hold your own code to the same bar you'd hold a
teammate's PR to.

## Non-negotiable context

- Global CLAUDE.md conventions apply (exports, controller pattern, ESLint,
  soft deletes, pagination shape, `httpResponse` no-double-wrap, etc.)
- **MongoDB does not exist in this project.** PostgreSQL (Prisma) + Redis
  only. Do not add Mongoose, do not add a `mongodb` config block, ever —
  this was deliberately stripped from the boilerplate.
- **AWS does not exist in this project.** No S3, no AWS SDK. If file storage
  is ever needed, it goes on local disk or an explicitly-approved provider —
  ask first, don't default to S3 because the old boilerplate had it.
- Stripe / SMTP / Twilio: not part of this product. Don't reintroduce them
  as "optional integrations" — this isn't a generic backend template
  anymore, it's ErrorLens.

## Tech stack (self-hosted, docker-compose)

- **Runtime**: Node.js + Express 5, ES Modules
- **DB**: PostgreSQL via Prisma 7 — driver-adapter model (`@prisma/adapter-pg`),
  connection URL lives in `prisma.config.js` + `.env`, **never** in
  `schema.prisma`'s `datasource` block (Prisma 7 forbids it)
- **Cache / dedup**: Redis (`ioredis`), password-protected even in dev
  (`docker-compose.yml` runs it with `--requirepass`)
- **Background jobs**: Inngest, self-hosted (own container, own Postgres
  database — `inngest`, separate from the app's `errorlens` database, own
  migrations it manages itself). Used for anything that must not block the
  ingestion request: git correlation, LLM analysis, webhook delivery. The
  client instance lives in `src/config/inngest.js`, alongside
  `databases.js` — it's a connection/config concern, same category as the
  Prisma or Redis clients, not a `shared/` utility. Every function lives
  under `src/shared/inngest/functions/<name>.function.js`, registered in
  `functions/index.js`. Don't scatter Inngest functions into individual
  feature modules or a separate `src/jobs/` — one home for all of it. The
  Express app serves them at `/api/inngest` via `inngest/express`'s
  `serve()`.
- **Git correlation**: Octokit, same lazy-client pattern as `ai.js`
  (`config/github.js`'s `getGithubClient()`). Logic lives in
  `shared/github/correlate-commit.js` — the simplest useful signal,
  `repos.listCommits({ owner, repo, path: fileName, per_page: 1 })`,
  i.e. "which commit most recently touched this exact file." Result is
  stored as `ErrorEvent.suspectCommit` (a `Json?` field: `sha`, `message`,
  `author`, `url`, `date` — not four separate columns, since it's always
  read/written as one unit and never queried by its sub-fields). Wrapped
  in try/catch inside its Inngest step same as everything else in that
  function — a failed GitHub lookup (rate limit, revoked token, private
  repo the token can't see) must not block AI analysis or webhook
  delivery, which both run independently of it.
- **LLM**: OpenAI-compatible client (`openai` npm package), pointed at
  Groq by default (`AI_BASE_URL=https://api.groq.com/openai/v1`,
  `AI_MODEL=openai/gpt-oss-120b`). Swapping providers is an env-var
  change, not a code change — any OpenAI-compatible endpoint works.
  Client lives in `src/config/ai.js` (connection/config concern, same
  category as `databases.js`/`redis.js`/`inngest.js`), but **must stay
  lazily constructed** (`getAiClient()`, not a top-level `new OpenAI()`)
  — the SDK throws at construction time if `apiKey` is falsy, and this
  module gets imported even when no key is configured. The prompt and the
  actual analysis call live in `src/shared/ai/` (`llm.js` +
  `prompts/error-analysis.prompt.js`) — this is business logic, not
  config, hence the split between the two directories. Analysis result is
  persisted to `ErrorEvent.aiAnalysis` and folded into the webhook payload
  when present. Gated entirely on `config.ai.apiKey` being set — no key
  means the step is skipped, not attempted-and-failed.
- **Alert delivery**: `webhookUrl` + `webhookProvider` per project.
  `webhookProvider` is an explicit enum (`EWebhookProvider` /
  Prisma `WebhookProvider`: `SLACK`, `TEAMS`, `DISCORD`, `CUSTOM`) set at
  project-creation time — not auto-detected from the URL's hostname, which
  breaks the moment someone proxies their webhook through a custom domain.
  The two fields travel together: `webhookUrl` set without
  `webhookProvider` (or vice versa) is a validation error, enforced in
  `createProjectSchema`. Payload *formatting* per provider (Slack blocks vs.
  Discord embeds vs. Teams Adaptive Cards) is still a delivery-service
  concern, not a schema concern — the enum only says which formatter to
  use, it doesn't encode the payload shape itself.

## Two auth chains — do not conflate them

ErrorLens has two completely different callers and they must never share a
middleware:

1. **Ingestion (machine-to-machine)** — the `errorlens-sdk` POSTing captured
   errors. Authenticated by a per-project **API key** (header, not JWT).
   Every ingestion request resolves to exactly one `Project` and every
   subsequent query in that request is scoped to that project's id. Use
   `authenticateApiKey` middleware for this chain.
2. **Control plane (human/admin)** — creating projects, listing/resolving
   errors, rotating API keys. There is no user/login system in this
   project — self-hosted, single-tenant, one instance per company — so
   this is **not** JWT. It's a single shared secret (`ADMIN_SECRET` env
   var) checked against the `x-admin-secret` header, via the
   `authenticateAdmin` middleware. No `jsonwebtoken`/`bcryptjs` deps in
   this project for the same reason — don't reintroduce them for a login
   flow nobody asked for.

Never let an ingestion request touch data outside its resolved `projectId`.
Never let the control plane skip auth because "it's just an internal call."

The ingestion endpoint also carries its own rate limit, separate from the
global IP-based one on the control plane — keyed by `req.project.id`
(set by `authenticateApiKey`), not by IP, via `ingestionRateLimiter`. One
busy or misbehaving project must not exhaust another project's ingestion
quota on the same self-hosted instance. `express-rate-limit` v8 requires
the `ipKeyGenerator` helper for any IP-based fallback in a custom
`keyGenerator` — it inspects the function's source text and throws at
startup if it sees `req.ip` used without it.

## Scale is a v1 requirement, not a later optimization

Assume tens of thousands to 100,000+ error events/day, bursty, across many
projects, from day one. This shapes the design, not just the query tuning:

- The ingestion endpoint does the absolute minimum synchronously: validate
  payload → resolve project from API key → compute the error fingerprint
  (normalize stack trace + hash) → Redis dedup check/increment → enqueue an
  Inngest event → respond. **Git correlation, LLM analysis, and webhook
  delivery never run in the request path.** They are Inngest functions.
- Redis dedup keys are fingerprint hashes scoped by project
  (`dedup:<projectId>:<fingerprint>`), always with a TTL — never store
  dedup state without an expiry.
- Every model that's queried by project must have a compound index
  `[projectId, isActive]` at minimum; time-ranged queries
  (`[projectId, createdAt]`) get their own index. No filtered query ships
  without checking the index exists first.
- No query inside a loop, anywhere — this matters more here than usual,
  since error ingestion is the hot path. Batch with `$in` / `createMany`.
- Prisma `select` is explicit on every query. Never fetch a full row when
  the caller needs three fields.
- List/detail reads use `getReadDB()`; writes and the ingestion path use
  `getWriteDB()`.
- Inngest functions must be idempotent (retries happen) and should fail
  loud into Inngest's own retry/dead-letter handling — don't swallow errors
  inside a step just to keep the function "green."

## Redis/Inngest failures must degrade, never take the app down

This was a real bug, not a hypothetical: `connectRedis()` used to `await
redis.ping()` with no timeout and no catch. When Redis was unreachable,
`ioredis`'s default retry behavior meant that `await` never resolved or
rejected — the app hung indefinitely at boot and never bound to its port.
No error, no log, just silence. A per-request try/catch around the
ingestion dedup call (which also exists, see below) does nothing if the
process never finished starting.

The fix has two parts, and both matter:
- **Boot-time**: `connectRedis()` races the ping against a 5s timeout and
  always resolves (never throws) — Redis being down delays boot by at
  most 5s, never blocks it. The `Redis` client itself is constructed with
  `connectTimeout`, `maxRetriesPerRequest: 1`, and a capped
  `retryStrategy` — fail fast, don't let a single command retry for
  20+ attempts on the ingestion hot path.
- **Request-time**: `ingestErrorService`'s Redis `SET NX` call is wrapped
  in try/catch. On failure, dedup falls back to a heuristic —
  `errorEvent.occurrenceCount === 1` after the Postgres upsert — instead
  of just assuming "always new" or "never new." `inngest.send()` is
  wrapped the same way: the error is already durably stored in Postgres
  by that point, so a down Inngest server must not fail the ingestion
  response, only skip enrichment for that occurrence.

The same principle applies to any future dependency on Redis or Inngest:
the ingestion path's only hard requirement is Postgres. Everything else
degrades.

## Module boundaries (multi-project data model)

- `Project` — name, generic `webhookUrl`, GitHub repo config, `isActive`,
  timestamps. The scoping root for everything else.
- `ApiKey` — belongs to a `Project`. Support multiple keys per project
  (rotation without downtime) unless told otherwise; store a hash, never
  the raw key, after creation. Hash with SHA-256 (`shared/utils/api-key.js`),
  **not bcrypt** — bcrypt's random salt makes it impossible to look up a
  key by hash with a unique index, and the ingestion hot path needs an
  O(1) lookup on every request. Bcrypt is for low-entropy human passwords;
  an API key is already a high-entropy random secret, so a fast
  deterministic hash is the correct tool, not a weaker one.
- `ErrorEvent` — carries `projectId`, `fingerprint` (unique per project,
  computed in `shared/utils/fingerprint.js` from the normalized top stack
  frames), `occurrenceCount`, and `status` (`ErrorStatus`: `NEW` /
  `RESOLVED` / `IGNORED`). Ingestion always `upsert`s on
  `[projectId, fingerprint]` — new fingerprint creates the row, a repeat
  increments `occurrenceCount`. A recurrence outside the Redis dedup TTL
  window flips `status` back to `NEW` even if it was `RESOLVED` — this is
  deliberate ("regression" behavior), not a bug. `RESOLVED`/`IGNORED`
  rows older than `RETENTION_DAYS` (default 90) are soft-deleted daily by
  the `error-retention` Inngest cron function — `NEW` rows are never
  auto-purged regardless of age, since those are unresolved issues.
- `meta` module — small, unauthenticated `GET /v1/meta` endpoint exposing
  project name, version, and author attribution (Manish Dash Sharma).
  This is the "who built this" module — keep it tiny, don't let it grow
  into a settings endpoint.

New modules are scaffolded from `src/modules/_template`, following the
structure in global CLAUDE.md (`controllers/`, `services/`, `routes/`,
`validations/`, `index.js`). One deviation from the template as written:
`index.js` exports only `{ <name>Routes }` as a named export — don't
wildcard-export controllers/services from a module's `index.js` unless
another module genuinely needs to import them directly, and if so, export
them explicitly by name, not via `export *`.

Routes: GET and POST only, per global convention. "Resolve" and "ignore"
on an error are POST actions, not PATCH/DELETE.

## Business logic lives in the service layer — no exceptions

Controllers only: take validated input, call exactly one service function,
shape the response, log, forward errors. If a controller contains a Prisma
call, a business rule, or any data transformation that isn't purely about
HTTP status/response shape, it's in the wrong file — move it to
`services/<name>.service.js`. Every module's business logic goes in its
service folder, full stop, no "just this once it's simpler in the
controller."

## Response shape — exactly three, never deeper

Every response `data` field is one of exactly three shapes. Do not nest
beyond this:

1. **Single resource** — `data: { <name>: {...} }`, e.g. `{ project: {} }`
2. **Unpaginated list** — `data: [...]`, only for small, fixed collections
   that will never grow with usage (e.g. enum values, static config)
3. **Paginated collection** — `data: { <name>: [...], pagination: {} }`

If a list can grow with usage (errors, projects, api keys, anything
scoped to a project), it's shape 3, never shape 2. Never wrap a response
inside another layer of `data` or mix these shapes.

### Pagination object — this project's shape, overrides the global default

The global CLAUDE.md pagination shape (`hasNextPage`/`total`) does not
apply here. Every `pagination` object in ErrorLens must contain exactly:

```js
{
  page,       // current page (1-indexed)
  limit,      // page size
  totalPage,  // Math.ceil(total / limit)
  nextPage,   // page + 1 if page < totalPage, else null
}
```

Compute `totalPage` and `nextPage` in the service, from the same
`Promise.all([count, findMany])` pattern the global convention already
requires — this changes what you hand back in `pagination`, not how you
fetch the data.

## Self-hosted Inngest: syncing the app is a real step, not optional

The app runs on the host; the self-hosted `inngest` container runs in
Docker. Two separate networking directions, both matter:

1. **App → Inngest** (`inngest.send()`, sending events): uses
   `INNGEST_BASE_URL` (`http://localhost:8288`), works immediately since
   that port is published to the host.
2. **Inngest → app** (the server invoking a function): the container has
   to call back into `/api/inngest` on the host. `localhost:3000` from
   *inside* the container means the container itself, not the host — this
   fails silently-ish (`"Unable to reach SDK URL"` in the Inngest
   container's logs, not in the app's). Fixed via `INNGEST_SERVE_ORIGIN`
   (`http://host.docker.internal:3000`), passed as `serveOrigin` to
   `serve()` in `app.js`. `docker-compose.yml`'s `inngest` service has
   `extra_hosts: host.docker.internal:host-gateway` so this also resolves
   on Linux (Docker Desktop gives it for free on macOS/Windows).

The app also has to **register** itself with the Inngest server before
any function will run — this isn't automatic. After boot (or after any
change to the function list), sync with:

```bash
curl -X PUT http://localhost:3000/api/inngest
```

If you skip this, events still publish and get received by Inngest fine
(`"publishing event"` / `"received event"` in its logs) — they just sit
there forever, because Inngest doesn't know your app exists yet. No error
on the app side either. If a webhook/function isn't firing, this sync
step is the first thing to check, before assuming the code is broken.

## Docker Compose is the source of truth for local infra

`docker-compose.yml` is the **production** file — `postgres`, `redis`,
`inngest`, and `app` (the ErrorLens API itself, built from the root
`Dockerfile`), all four services, `docker compose up -d` and a VPS is
fully running. Don't introduce a fourth way to run these (no separate
install instructions, no "or install Postgres natively" fallback in
docs).

Local development doesn't run `app` in Docker — hot-reload via
`npm run dev` on the host is faster than rebuilding an image per change.
`docker-compose.dev.yml` — checked into the repo, not gitignored, so
every contributor gets the same local setup — is `docker-compose.yml`
minus the `app` service, for exactly this. See `CONTRIBUTING.md`.

`Dockerfile` is a two-stage build: `deps` (just `npm ci`, cached
separately so it doesn't reinstall on every source change) and `runtime`
(copies `node_modules` + `prisma/` + `prisma.config.js` + `src/` — not
`COPY . .`, deliberately excludes docs/sessions/tests from the image).
`prisma generate` at build time needs `DATABASE_URL` to resolve (not a
live connection, just to parse `prisma.config.js`) — passed as a build
`ARG` with a placeholder default, scoped to that one `RUN` command only.
Never switch this to `ENV` — `ENV` persists in every layer after it and
bakes a fake credential permanently into the image; `ARG` used inline
(`RUN DATABASE_URL=$DATABASE_URL npx prisma generate`) doesn't. The real
`DATABASE_URL` always comes from `docker-compose.yml`'s `environment:`
block at container runtime and overrides whatever the image defaults to.
Migrations run automatically on container start (`prisma migrate deploy`
in the `CMD`, before `node src/server.js`) — self-hosters never run a
manual migration step.

## Published image: `docker/` is a standalone distribution, not a fourth way to run infra

`.github/workflows/docker-publish.yml` builds the root `Dockerfile` on
every `v*` tag push and publishes multi-arch
(`linux/amd64`/`linux/arm64`) images to
`ghcr.io/manishdashsharma/errorlens`, tagged `latest`, `<major>.<minor>`,
and the exact version — then drafts a GitHub Release from the tag. This
reuses the same `Dockerfile` as local `docker compose build`; it does not
introduce a second build path.

`docker/` is a self-contained copy of the same four-service stack from
root `docker-compose.yml`, except the `app` service uses `image:
ghcr.io/manishdashsharma/errorlens:latest` instead of `build: .`. It
exists so a self-hoster can deploy without cloning the repo at all — just
the three files documented in `docker/README.md`
(`docker-compose.yml`, `.env.example`, `inngest-init/*.sql`). Keep this
folder's `docker-compose.yml` in sync with the root one on any
infra-service change (ports, healthchecks, env vars) — the only
intentional diff between them is `build: .` vs `image: ...`.

Inside the full stack, `app` reaches `postgres`/`redis`/`inngest` by
service name (Docker's internal DNS) — no `host.docker.internal` hack
needed there, that workaround is `docker-compose.dev.yml`-only, for when
Inngest (in Docker) has to call back into the app running on the host.

## Comments

Zero, per global rule — this is an open-source project other engineers will
read; make the code self-explanatory through naming instead of leaning on
comments that rot.

## Session notes — write these before wrapping up

`sessions/` is gitignored — it's working memory across Claude sessions in
this repo, not project documentation. At the end of a session that did
real work (not for trivial one-line asks), write or append
`sessions/<YYYY-MM-DD>.md` covering:

- What was built/changed/decided, and why (not just a diff summary)
- Any open decision the user made that isn't obvious from the code
  (e.g. "generic webhook, not Slack-specific", "pagination uses
  nextPage/totalPage, not the global hasNextPage/total shape")
- What's left / the natural next step

A future session should be able to read the latest file in `sessions/` and
pick up with full context, without the user re-explaining anything. Check
`sessions/` for the most recent file at the start of a session if the
conversation doesn't already carry that context.
