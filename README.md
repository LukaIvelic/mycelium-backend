# Backend Metrics Comparison

Date: 2026-05-03

This file compares the refactored backend on `http://127.0.0.1:8000` against the legacy backend on `http://127.0.0.1:8001`.

## Scope

- Refactor Swagger UI: `/docs`
- Refactor OpenAPI JSON: `/docs-json`
- Legacy Swagger UI: `/api`
- Legacy OpenAPI JSON: `/api-json`
- Global API prefix on both services: `/api`
- Test traffic stayed read-only. No create, update, delete, or revoke routes were called.
- Both apps were benchmarked over loopback (`127.0.0.1`) against the same Postgres and Redis endpoints from local `.env`.
- Authenticated GET routes were exercised with a generated bearer token for an existing user in the shared database.
- Public login was measured with an existing email and an intentionally wrong password so the route stayed non-mutating.
- `GET /api/authentication/validate` was sampled only 5 times per service because both implementations enforce a 10 requests/minute IP rate limit.

## Surface Metrics

| Metric | Refactor `:8000` | Legacy `:8001` |
| --- | ---: | ---: |
| OpenAPI paths | 13 | 22 |
| OpenAPI operations | 18 | 27 |

Refactor-only paths:

- `/api/api-keys`
- `/api/projects/by-api-key`

Legacy-only paths:

- `/api/api-keys/user/{userId}`
- `/api/api-keys/{id}/project`
- `/api/api-keys/{projectId}`
- `/api/logs`
- `/api/logs/{projectId}`
- `/api/logs/{projectId}/{logId}/detail`
- `/api/projects/user/{user_id}`
- `/api/react-flow/{projectId}`
- `/api/services/register`
- `/api/services/{serviceId}`
- `/api/users/{id}/projects`

The refactor clearly reduced the exposed surface area and also consolidated several legacy path shapes into current-user routes or query-param routes.

## Main Findings

- The refactor was slightly faster on Swagger delivery and on the project lookup by API-key route.
- The legacy service was faster on most authenticated read routes and on the invalid-login path.
- The largest regression is `GET /api/projects/{id}/has-api-key` on the refactor. It showed consistent tail spikes.
- Payload shapes are not identical on every mapped route, so some latency numbers are not perfectly apples-to-apples.

Examples of payload-shape drift that affected size:

- `GET /api/api-keys`: refactor returned only the active key for the tested user; legacy returned active plus revoked keys and nested `project` objects.
- `GET /api/users/me`: refactor returned camelCase fields; legacy returned snake_case plus derived `full_name` and `initials`.
- `GET /api/projects/{id}`: refactor returned more metadata fields than legacy.

## Route Benchmarks

All timings are end-to-end response times in milliseconds, measured on localhost, after a short warmup unless noted otherwise.

| Route | Refactor avg / p95 | Legacy avg / p95 | Delta avg | Notes |
| --- | ---: | ---: | ---: | --- |
| `GET /docs` vs `GET /api` | `0.61 / 1.10` | `0.63 / 1.04` | `-0.02` | Essentially identical |
| `GET /docs-json` vs `GET /api-json` | `0.59 / 0.88` | `0.66 / 1.13` | `-0.07` | Refactor JSON spec is smaller |
| `GET /api/authentication/validate?email=<existing>` | `53.81 / 134.09` | `59.59 / 183.90` | `-5.78` | Only 5 samples each because of rate limiting |
| `POST /api/authentication/login` with existing email + wrong password | `83.39 / 90.63` | `76.41 / 80.85` | `+6.98` | Legacy faster |
| `GET /api/users/me` | `35.80 / 44.91` | `27.95 / 32.81` | `+7.85` | Legacy faster |
| `GET /api/users/{id}` | `34.62 / 41.81` | `27.72 / 34.50` | `+6.90` | Legacy faster |
| `GET /api/projects` vs `GET /api/projects/user/{user_id}` | `35.31 / 38.51` | `26.45 / 29.84` | `+8.86` | Legacy faster |
| `GET /api/projects?hasApiKey=true` vs legacy user route | `34.40 / 38.44` | `26.57 / 29.63` | `+7.83` | Legacy faster |
| `GET /api/projects?hasApiKey=false` vs legacy user route | `33.21 / 42.47` | `28.43 / 32.09` | `+4.78` | Legacy faster |
| `GET /api/projects/{id}` | `34.89 / 42.93` | `26.85 / 35.79` | `+8.04` | Legacy faster despite smaller response |
| `GET /api/projects/{id}/has-api-key` | `81.32 / 306.37` | `51.99 / 61.66` | `+29.33` | Worst refactor regression |
| `GET /api/projects/by-api-key?apiKeyId={id}` vs `GET /api/api-keys/{id}/project` | `37.92 / 43.63` | `51.71 / 57.55` | `-13.79` | Refactor faster |
| `GET /api/api-keys` vs `GET /api/api-keys/user/{userId}` | `37.43 / 64.65` | `27.58 / 31.90` | `+9.85` | Legacy faster even with larger payload |

Interpretation of `Delta avg`:

- Negative: refactor faster
- Positive: refactor slower

## Follow-Up Check On High-Variance Routes

Three routes were rerun with 30 measured samples to verify whether the first pass reflected real behavior or just noise.

| Route | Refactor avg / p95 | Legacy avg / p95 | Delta avg | Result |
| --- | ---: | ---: | ---: | --- |
| `GET /api/projects/{id}/has-api-key` | `78.71 / 305.51` | `51.15 / 58.16` | `+27.56` | Regression confirmed |
| `GET /api/projects/by-api-key?apiKeyId={id}` vs legacy pair | `44.23 / 47.06` | `53.24 / 60.10` | `-9.01` | Refactor still faster |
| `GET /api/api-keys` vs legacy pair | `34.95 / 41.61` | `26.89 / 28.38` | `+8.06` | Regression confirmed |

The by-API-key route had one large refactor outlier in the 30-sample run, but its normal latency band still stayed below legacy. The `has-api-key` route is different: its p95 remained far worse in the refactor, which makes that one the clearest hotspot.

## Bottom Line

- The refactor reduced route surface area from `22` paths / `27` operations to `13` paths / `18` operations.
- For simple doc delivery, both services are effectively the same, with a slight edge to the refactor.
- For public auth, results are mixed: `validate` leaned slightly faster on the refactor, while invalid login was slower.
- For authenticated reads, the legacy service was faster on 8 of the 9 mapped route pairs by average latency.
- The most important regression to investigate first is `GET /api/projects/{id}/has-api-key`.
