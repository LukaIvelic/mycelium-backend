# Project Module

Groups tracked services under a named workspace owned by a single user and acts as the anchor point for API key issuance and log ingestion.

## Purpose

A project is the top-level organizational unit in Mycelium. Every API key belongs to a project, and every log row carries a `project_id` derived from the API key used to ingest it. The module owns creation, soft-invalidation, and the guarded endpoint that turns a project into an instrumented service by attaching an API key.

Ownership is a first-class concept here. Before any write that affects a project's state or resources, the service asserts that the authenticated user's JWT `sub` matches the project's `user_id`. The check is intentionally repeated in-line (not abstracted into a decorator) so the guard logic is always co-located with the operation that needs it.

## Data Model

### [`Project`](./project.entity.ts)

```
id           uuid    pk, auto-generated
name         string
description  string  nullable
user_id      uuid    fk → user.id (via ManyToOne)
valid_from   date    default CURRENT_TIMESTAMP
valid_to     date    null = active; set on soft-delete
created_at   date    default CURRENT_TIMESTAMP
updated_at   date    null until first update
```

`valid_from`, `valid_to`, and `updated_at` are decorated with `@Exclude()` and never appear in serialized responses. The `user` relation is joined on demand; the FK column `user_id` is not exposed as a separate column in responses.

There is no hard delete. Setting `valid_to` to the current timestamp is the full invalidation operation. Nothing downstream filters on `valid_to` automatically — callers that need only active projects must add the predicate themselves.

## Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/projects` | None | List all projects |
| `GET` | `/projects/:id` | None | Get one project by ID |
| `GET` | `/projects/:id/has-api-key` | None | Check if a project has an active (non-revoked) API key |
| `GET` | `/projects/user/:user_id` | None | List projects for a user, with optional `hasApiKey` filter |
| `POST` | `/projects` | None | Create a project |
| `PATCH` | `/projects/:id` | None | Update name or description |
| `DELETE` | `/projects/:id` | None | Soft-invalidate a project |
| `POST` | `/projects/:id/api-key` | JWT | Generate an API key for the project |

The `POST /projects/:id/api-key` endpoint is the only one guarded by `JwtGuard`. All other endpoints are currently open — auth enforcement at this layer is a known follow-up.

## User Filter (`hasApiKey` query param)

`GET /projects/user/:user_id` accepts an optional `hasApiKey` query parameter:

- `?hasApiKey=true` — only projects that have at least one non-revoked API key (`INNER JOIN` on `api_key` where `revoked_at IS NULL`)
- `?hasApiKey=false` — only projects with no active API key (`LEFT JOIN` + `WHERE ak.id IS NULL`)
- omitted — all projects for the user, no key filter

Values other than `"true"` and `"false"` throw `400 Bad Request`. The parsing happens in the controller via `parseHasApiKey()` so the service receives a typed `boolean | undefined` rather than a raw string.

## API Key Issuance

`POST /projects/:id/api-key` is where a project gets connected to the SDK. The flow:

1. `JwtGuard` verifies the Bearer token and attaches `{ sub, email }` to `request['user']`.
2. Service loads the project and verifies `project.user.id === sub`. Throws `403 Forbidden` if not.
3. Calls `ApiKeyService.countActiveKeysForUser(sub)`. If the user already has 3 or more active keys across all their projects, throws `409 Conflict`.
4. Delegates to `ApiKeyService.createApiKey(projectId, name)`, which generates the key, hashes it, persists the entity, and registers the hash in the bloom filter.
5. Returns `{ key, message, entity }`. The raw key is shown once and never stored.

The 3-key cap is a user-level constraint, not a project-level one. A user can have one API key per project, but only up to 3 projects can have active keys simultaneously.

## Invalidation

`DELETE /projects/:id` sets `valid_to = new Date()` on the project row. It does not cascade to API keys — a project can be soft-deleted while its API key remains active (and ingestion continues). This is a known edge case; a cleanup step that revokes keys on project invalidation will be needed before production.

## Ownership Assertion

`ProjectService.assertUserOwnsProject(projectId, userId)` is a shared utility consumed by `LogModule` to gate log reads. It loads the project with its `user` relation and compares `project.user.id` against the caller's JWT `sub`. Throws `404` if the project doesn't exist and `403` if the IDs don't match.

The same pattern is inlined in `addApiKeyToProject()` rather than calling `assertUserOwnsProject()` because that method also needs the loaded project entity for subsequent operations — one query instead of two.

## Module Wiring

[`ProjectModule`](./project.module.ts) imports:

- `TypeOrmModule.forFeature([Project])` — the `Project` repository.
- `forwardRef(() => AuthModule)` — resolves the circular dependency between `AuthModule` (which exports `JwtGuard`) and `ProjectModule` (which needs `JwtGuard` for the API key endpoint).
- `ApiKeyModule` — provides `ApiKeyService` for key creation and the active-key check.

Controllers: `ProjectController`. Providers: `ProjectService`. Exports: `ProjectService` — consumed by `UserModule` (`GET /users/:id/projects`) and `LogModule` (ownership assertion before log reads).

## Known Limits / Follow-ups

- **Open endpoints.** Most project routes are not guarded. Any authenticated user can read or mutate any project by ID. Ownership checks need to be added before this is multi-tenant safe.
- **Invalidation does not revoke keys.** Soft-deleting a project leaves its API key active. SDK traffic from a "deleted" project continues to be ingested.
- **No cascade.** Deleting or invalidating a user does not invalidate their projects. Orphaned projects (user invalidated, project still active) are possible.

---

## Sequence Diagram Description

For project creation, a client sends POST /projects with { name, description, user_id }. ProjectController delegates to ProjectService.create(), which calls projectRepository.create() with the provided fields and user reference, then saves to the database and returns the entity. For listing a user's projects, a client sends GET /projects/user/:user_id with an optional hasApiKey query parameter. ProjectController parses the query value to a boolean or undefined, then calls ProjectService.findByUserId(). The service builds a QueryBuilder starting from the project table, filters by user_id, then conditionally applies an INNER JOIN (hasApiKey=true) or LEFT JOIN + WHERE ak.id IS NULL (hasApiKey=false) against the api_key table. For API key issuance, a client sends POST /projects/:id/api-key with a Bearer token and optional { name } body. JwtGuard verifies the token and attaches { sub, email } to request.user. ProjectController extracts sub and calls ProjectService.addApiKeyToProject(id, sub, name). The service loads the project with its user relation and compares user.id to sub — throwing 403 if they differ. It then calls ApiKeyService.countActiveKeysForUser(sub); if the count is 3 or more it throws 409 Conflict. Otherwise it calls ApiKeyService.createApiKey(projectId, name), which generates 32 random bytes, hashes them with SHA-256, persists the entity, adds the hash to the bloom filter, and returns { key, message, entity }. The raw key is returned to the client and never stored again. For project invalidation, a client sends DELETE /projects/:id. ProjectService.invalidate() calls findOne() to confirm existence, sets valid_to to now, and saves. No cascade to API keys or logs occurs.
