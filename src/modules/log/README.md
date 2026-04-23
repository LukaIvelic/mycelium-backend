# Log Module

Ingests HTTP request telemetry produced by the Mycelium SDK and exposes it back to project owners.

## Purpose

Every tracked service runs the Mycelium SDK, which intercepts outbound HTTP/fetch traffic via Node's `diagnostics_channel`, tags each request with a trace/span identifier, and ships a `LogReadyRequest` payload to this service. This module is the ingestion endpoint, the storage layer, and the read API that the dashboard uses to reconstruct the call graph.

The domain split is intentional: *structure* vs *details*. The trace skeleton (who called whom, when, how long, what status) is what we iterate over constantly to build graphs and lists. The payload of a single call (headers, body, boolean flags) is only interesting after a user has drilled into a specific node. Those are two different access patterns, and the schema is shaped to match.

## Data model

Two entities, 1:1 relationship, shared primary key.

### [`Log`](./log.entity.ts) — the structure

```
id                   uuid  pk
project_id           uuid  fk → project.id (cascade)
api_key_id           uuid  fk → api_key.id (cascade)
trace_id             varchar(64)    indexed
span_id              varchar(32)
parent_span_id       varchar(32)    nullable
service_key          varchar(255)   nullable
service_name         varchar(255)   nullable
service_version      varchar(255)   nullable
service_description  text           nullable
service_origin       text           nullable
method               varchar(16)
path                 text
origin               text
protocol             varchar(16)
status_code          int
duration_ms          int
timestamp            timestamptz
created_at           timestamptz    default now()
```

The `service_*` columns carry metadata about the originating service — the SDK-assigned key, a human-readable name, a semver version string, a free-text description, and the base URL of that service. All are optional; services that don't set them send nulls and the columns are stored as such.

Indexes:
- `(project_id, timestamp)` — the list endpoint filters by project and orders by timestamp desc. Covering both columns together lets Postgres walk the index in order without a sort step.
- `(trace_id)` — the dashboard reconstructs a full trace from a single span by pulling every `Log` that shares a `trace_id`. That query has to be fast.

### [`LogDetail`](./log-detail.entity.ts) — the heavy payload

```
log_id          uuid  pk & fk → log.id (cascade)
body_size_kb    double precision
content_length  int
content_type    varchar(255)
body            text         nullable
headers         jsonb
completed       boolean
aborted         boolean
idempotent      boolean
```

The table uses `log_id` as both primary key and foreign key — one row per log, no separate identity. Cascade delete means removing a `Log` removes its detail atomically at the DB layer with no application logic.

### Why the split

The earlier single-table design held up fine on throughput — Postgres already TOASTs large `text` and `jsonb` columns out-of-line, so a narrow `SELECT` on the list endpoint wasn't going to touch the body or headers anyway. The split wasn't made for performance; it was made for clarity.

The two sides represent two different *questions* a caller is asking:

- **"What happened in this project?"** — needs the skeleton, millions of rows, scanned and aggregated often.
- **"What exactly did this one request look like?"** — needs the payload, one row at a time, read rarely.

Putting them in separate tables makes that distinction structural rather than conventional. A future reader doesn't have to guess which columns the list path uses; they're literally not in the same entity. It also opens the door to different retention policies later — keeping summary rows for a year while purging bodies after 30 days becomes a one-table truncate instead of a column-level UPDATE.

## Auth model

Two endpoints, two different trust boundaries.

### Ingress: `POST /api/logs` — API key (the SDK)

Guarded by [`ApiKeyGuard`](../api-key/api-key.guard.ts). The SDK ships an `x-api-key` header; the guard:

1. Hashes it and checks the per-key rate limiter (Redis, 100 req/s/key).
2. Validates the key through the bloom → local cache → redis → DB lookup chain in [`ApiKeyService`](../api-key/api-key.service.ts).
3. Attaches the full `ApiKey` entity to `request['apiKey']`.

The controller reads `apiKey.project_id` and `apiKey.id` off that and hands both to the service. The SDK never sends a project id — it can't, it doesn't know one. Project ownership is derived server-side from the key. This keeps the SDK stateless, prevents a compromised key from forging logs against a project it doesn't own, and means rotating or revoking a key is the entire story for cutting off ingestion.

### Egress: `GET /api/logs/:projectId` and `GET /api/logs/:projectId/:logId/detail` — JWT (the dashboard)

Guarded by [`JwtGuard`](../auth/jwt.guard.ts). The authenticated user's `sub` is checked against `project.user_id` via [`ProjectService.assertUserOwnsProject`](../project/project.service.ts). Reads are explicitly owner-only — no public logs, no cross-tenant reads, no admin-on-behalf-of path (yet).

These are two different actors (automated agent vs human), two different credential types (long-lived key vs short-lived token), and two different authorization models (prove you hold the key vs prove you own the project). Keeping them on separate guards rather than one unified "auth" middleware makes that explicit.

## Endpoints

| Method | Path | Guard | Purpose |
|---|---|---|---|
| POST | `/api/logs` | `ApiKeyGuard` | SDK pushes a single log |
| GET | `/api/logs/:projectId` | `JwtGuard` | Owner lists logs, newest first, paginated |
| GET | `/api/logs/:projectId/:logId/detail` | `JwtGuard` | Owner fetches the body/headers/flags for one log |

Pagination on the list endpoint: `limit` (1–1000, default 100) and `offset` (default 0), validated in [`ListLogsQueryDto`](./log.dto.ts). `limit` is capped to stop a rogue query from pulling a project's entire history in one shot; offset-based paging is fine at current scale and can be swapped for cursor paging later if the offset cost on deep pages matters.

## Write path

[`LogService.create`](./log.service.ts) wraps both inserts in a `dataSource.transaction`:

1. Save `Log` — Postgres generates the uuid.
2. Save `LogDetail` with `log_id` = the generated id.

If step 2 fails, step 1 rolls back. The invariant we care about is "no orphaned structure without detail, no orphaned detail without structure" — the transaction enforces it without needing a separate cleanup job.

Field naming bridges the SDK's camelCase `LogReadyRequest` to the DB's snake_case columns in the service, not in the DTO. The DTO stays close to the wire format (what the SDK sends), the entity stays close to the DB (what Postgres stores), and the service owns the translation. That means a rename on either side doesn't force a change on the other.

## Read path

- **List:** a plain `find({ where: { project_id }, order: { timestamp: 'DESC' } })`. Postgres uses the `(project_id, timestamp)` index directly. `LogDetail` is not touched.
- **Detail:** `findOne({ where: { id, project_id }, relations: ['detail'] })`. The `project_id` predicate in the lookup itself, combined with the pre-flight ownership check, means a user can't fetch a detail by probing log ids across projects — even a correctly-guessed `logId` from a different project returns 404.

## Module wiring

[`LogModule`](./log.module.ts) imports:

- `TypeOrmModule.forFeature([Log, LogDetail])` — repositories for both.
- `ApiKeyModule` — provides `ApiKeyGuard` (which itself pulls `ApiKeyService` + `ApiKeyRateLimiterService`, both re-exported from that module so guards instantiated here can resolve).
- `AuthModule` — provides `JwtGuard`.
- `ProjectModule` — provides `ProjectService` for the ownership assertion.

Controllers: `LogController`. Providers: `LogService`. Exports: `LogService` (in case another module ever needs to read logs server-side; nothing consumes it yet).

## Known limits / follow-ups

- **Ingestion rate cap.** `ApiKeyGuard` enforces 100 req/s per key. Fine for a single-SDK demo or low-traffic service; a batch ingest endpoint (`POST /api/logs/batch`) will be needed before this scales to real microservice traffic.
- **Offset pagination** on the list endpoint costs more on deep pages as row counts grow. Cursor paging keyed on `(timestamp, id)` is the natural next step.
- **No retention policy yet.** The table-split makes tiered retention (keep summaries longer than details) trivial to add once we decide what the policy should be.
