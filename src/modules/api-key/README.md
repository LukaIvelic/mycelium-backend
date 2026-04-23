# API Key Module

## Directory Structure

```
api-key/
  cache/
    api-key-bloom.service.ts        Counting Bloom Filter (L0)
    api-key-local-cache.service.ts  In-memory LRU cache (L1)
    api-key-redis.service.ts        Redis shared cache (L2)
    api-key-rate-limiter.service.ts Redis-based per-key rate limiter
  entities/
    api_key.entity.ts               API key entity
    api_key_daily_stats.entity.ts   Daily usage statistics
    api_key_ip_stats.entity.ts      Per-IP usage statistics
  api-key.controller.ts             POST / DELETE endpoints (JWT-protected)
  api-key.guard.ts                  NestJS guard for x-api-key header validation
  api-key.module.ts                 Module registration
  api-key.service.ts                Orchestrates all layers + create/revoke logic
```

## Key Format

- Raw key: 32 random bytes encoded as 64-character hex string
- Stored as: SHA-256 hash of the raw key (the raw key is never persisted)
- Prefix: first 8 characters of the raw key, stored for display/identification
- The raw key is returned to the user exactly once at creation time

## Rate Limiting

Before the 4-layer lookup, `ApiKeyGuard` enforces a per-key rate limit via `ApiKeyRateLimiterService`.

- **Window:** 1 second (fixed)
- **Limit:** 100 requests per second per API key
- **Mechanism:** Atomic Redis `INCR` + `EXPIRE` via a Lua script. The counter key is `ratelimit:{hash}:{windowSecond}`. If the key is new in this window, `EXPIRE` is set atomically in the same script.
- **Response:** `429 Too Many Requests` if the count exceeds the limit. The 4-layer validation is never reached.
- **Scope:** Shared across all instances via Redis.

## Validation Flow (4-Layer Lookup)

When a request arrives with an `x-api-key` header, `ApiKeyGuard` extracts the raw key, checks the rate limit, then calls `ApiKeyService.validateApiKey()`. The raw key is hashed with SHA-256 and then checked against four layers in order. Each layer either returns `undefined` to continue or returns a terminal result (`ApiKey` or `null`) to stop the lookup chain.

### L0 - Bloom Filter (Counting Bloom Filter)

- **Latency:** ~0ms, no I/O
- **Purpose:** Probabilistic rejection. If the bloom filter says "no", the key definitely does not exist. Rejects invalid keys instantly without touching any cache or database.
- **False positives:** Configured at 1%. A false positive just means one unnecessary check against the next layers, not a security issue.
- **Seeded at startup** from all non-revoked key hashes in the database. Uses a Counting Bloom Filter so entries can be removed on revocation without rebuilding.

### L1 - In-Memory LRU Cache (per instance)

- **Latency:** ~0ms, no I/O
- **Purpose:** Avoids repeated network calls to Redis for hot keys within the same process.
- **Capacity:** 10,000 entries, 60-second TTL.
- **Negative caching:** Caches "key not found" results using a Symbol sentinel, so invalid keys that pass the bloom filter are also served from memory on repeat lookups.
- **Scope:** Per Node.js process. Each instance has its own independent cache.

### L2 - Redis (shared across instances)

- **Latency:** ~1ms network hop
- **Purpose:** Shared cache across all application instances. When one instance resolves a key from the database, all other instances benefit from the Redis entry.
- **TTL:** Configurable via `API_KEY_TTL_VALID_SECONDS` (default 600s) for valid keys, `API_KEY_TTL_INVALID_SECONDS` (default 30s) for negative results.
- **Negative caching:** Stores a `__NOT_FOUND__` sentinel string to distinguish "checked and doesn't exist" from "never checked".
- **Backfill:** On Redis hit, the result is also written into L1 so subsequent lookups from the same instance skip Redis entirely.

### L3 - PostgreSQL Database (source of truth)

- **Latency:** ~5-20ms
- **Purpose:** Authoritative lookup. Only reached when all caches miss.
- **Query:** Finds by `key_hash` where `revoked_at IS NULL`.
- **Backfill:** On database hit or miss, populates both Redis (L2) and in-memory cache (L1) so future lookups for the same hash are served from cache.

## Creation Flow

1. User calls `POST /api-keys` with a valid JWT Bearer token.
2. Service checks if the user already has an active (non-revoked) API key. If so, returns 409 Conflict.
3. Generates 32 random bytes, encodes as hex (64-char raw key).
4. Computes SHA-256 hash of the raw key.
5. Stores the hash, first 8 chars as prefix, and user_id in the database.
6. Adds the hash to the bloom filter.
7. Returns the raw key and entity to the user. This is the only time the raw key is visible.

## Revocation Flow

1. User calls `DELETE /api-keys` with a valid JWT Bearer token.
2. Service looks up the user's active (non-revoked) key by user_id.
3. If no active key exists, returns silently (no error).
4. Removes the key hash from the bloom filter (counting bloom filter supports deletion).
5. Deletes the key hash from the in-memory LRU cache.
6. Deletes the key hash from Redis.
7. Sets `revoked_at` timestamp on the database record (soft delete).

After revocation, the key is immediately rejected at L0 (bloom filter) for most lookups, and any stale L1 cache entries expire within 60 seconds.

## Guard Usage

`ApiKeyGuard` is exported from the module. Any route can require API key authentication:

```ts
@UseGuards(ApiKeyGuard)
@Get('protected')
async handler(@Req() req: Request) {
  const apiKey = req['apiKey']; // full ApiKey entity
}
```

The guard reads the raw key from the `x-api-key` HTTP header, enforces the per-key rate limit (429 if exceeded), runs the key through the 4-layer validation pipeline, and attaches the resolved ApiKey entity to the request object.

## Constraints

- A user can have at most one active API key at a time. They must revoke the existing key before creating a new one.
- The raw key is shown once at creation and never stored. If lost, the user must revoke and create a new one.

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `REDIS_URL` | `redis://localhost:6379` | Redis connection URL |
| `API_KEY_TTL_VALID_SECONDS` | `600` | Redis TTL for valid API keys |
| `API_KEY_TTL_INVALID_SECONDS` | `30` | Redis TTL for cached negative lookups |

---

## Sequence Diagram Description

A client sends an HTTP request with an x-api-key header to the NestJS backend. The ApiKeyGuard intercepts the request, extracts the raw API key from the x-api-key header, and hashes it with SHA-256. The guard checks the rate limit via ApiKeyRateLimiterService: it increments a Redis counter keyed by `ratelimit:{hash}:{windowSecond}` using an atomic Lua script; if the count exceeds 100 within the current second, the guard immediately throws a 429 Too Many Requests error. If within the rate limit, the raw key is passed to ApiKeyService.validateApiKey(). The service hashes the key again and checks the Counting Bloom Filter: if the bloom filter returns false, the key definitely does not exist and the service immediately returns null, causing the guard to throw an UnauthorizedException. If the bloom filter returns true (the key might exist), the service checks the in-memory LRU cache using the hash. If found in the LRU cache, the result is returned immediately, either as a valid ApiKey entity or null for a cached negative. If the LRU cache misses, the service queries Redis using the key "apikey:" prefixed with the hash. If Redis has the entry, the result is written back into the LRU cache for future lookups and returned. If Redis also misses, the service queries the PostgreSQL database for a record matching the key_hash where revoked_at is null. Whatever the database returns, the result is written into both Redis with a configurable TTL and the LRU cache, then returned. The guard receives the final result: if it is a valid ApiKey entity, the guard attaches it to the request object under request.apiKey and allows the request to proceed; if it is null, the guard throws an UnauthorizedException and the request is rejected. For key creation, an authenticated user calls POST /api-keys, the service checks that no active key exists for that user, generates 32 random bytes as the raw key, hashes it with SHA-256, stores the hash and prefix in PostgreSQL, adds the hash to the bloom filter, and returns the raw key to the user once. For revocation, an authenticated user calls DELETE /api-keys, the service finds their active key, removes the hash from the bloom filter, deletes it from the LRU cache and Redis, and sets revoked_at on the database record.
