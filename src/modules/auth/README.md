# Auth Module

## Directory Structure

```
auth/
  auth.controller.ts                  POST /auth/login + GET /auth/validate/:id endpoints
  auth.dto.ts                         LoginDto (request) and TokenDto (response)
  auth.service.ts                     Credential validation, JWT issuance, user validation
  jwt.guard.ts                        NestJS guard for Bearer token verification
  validate-user-rate-limit.guard.ts   IP-based rate limit guard for validate endpoint
  cache/
    auth-rate-limiter.service.ts      Redis sliding-window rate limiter
  auth.module.ts                      Module registration with circular-dep forward ref
```

## Login Flow

1. Client sends `POST /auth/login` with `{ email, password }`.
2. `AuthService` calls `UserService.findByEmail()` to look up a non-invalidated user by email.
3. If no user is found, throws `401 Unauthorized` with a generic `"Invalid credentials"` message.
4. `bcrypt.compare()` checks the provided password against the stored `password_hash`.
5. If the hash does not match, throws `401 Unauthorized` with the same generic message.
6. On success, `JwtService.signAsync()` produces a signed JWT with payload `{ sub: user.id, email: user.email }`.
7. Returns `{ access_token: "<jwt>" }`.

Both failure cases return the same `"Invalid credentials"` message to avoid leaking whether an email is registered.

## Token Format

- **Algorithm:** HS256 (HMAC-SHA256) via `@nestjs/jwt`
- **Payload:** `{ sub: <user uuid>, email: <user email>, iat: <issued-at>, exp: <expiry> }`
- **Expiry:** 7 days from issuance
- **Secret:** `JWT_SECRET` environment variable

## Guard Usage

`JwtGuard` is exported from the module and used by any route that requires an authenticated user:

```ts
@UseGuards(JwtGuard)
@Get('protected')
async handler(@Req() req: Request) {
  const user = req['user']; // JWT payload: { sub, email, iat, exp }
}
```

The guard reads the token from the `Authorization: Bearer <token>` header. If the header is absent, malformed (not `Bearer`), or the token fails verification, it throws `401 Unauthorized`. On success it attaches the decoded JWT payload to `request['user']`.

## Module Dependencies

`AuthModule` and `UserModule` have a circular dependency (`AuthService` needs `UserService`; `UserController` needs `JwtGuard` from `AuthModule`). This is resolved with `forwardRef()` in both modules.

`AuthModule` exports:
- `JwtGuard` — so other modules (`UserModule`, `ApiKeyModule`) can apply it without re-importing `JwtModule` themselves.
- `JwtModule` — so other modules can inject `JwtService` if needed.

## User Validation Flow (Rate-Limited)

### `GET /auth/validate/:id`

Public endpoint for frontend UX — checks if a user exists and is valid without requiring authentication.

**Request flow:**

1. `ValidateUserRateLimitGuard` runs first (via `@UseGuards`).
2. Guard extracts client IP from `request.ip` (falls back to `request.socket.remoteAddress`).
3. Guard calls `AuthRateLimiterService.isRateLimited(ip)`.
4. If rate limited, returns `429 Too Many Requests` — request never reaches the handler.
5. If allowed, `AuthController.validateUser(id)` calls `AuthService.validateUser(id)`.
6. `AuthService` delegates to `UserService.findOne(id)` which queries for a user with matching ID and `valid_to IS NULL`.
7. Returns the user object (200) or throws `404 Not Found`.

### `AuthRateLimiterService` (`cache/auth-rate-limiter.service.ts`)

Redis-backed fixed-window rate limiter keyed by IP.

**Constants:**

| Name | Value | Purpose |
|------|-------|---------|
| `RATE_LIMIT_PREFIX` | `ratelimit:validate-user:` | Redis key namespace, separate from API key rate limits |
| `WINDOW_SECONDS` | `60` | Duration of each rate limit window (1 minute) |
| `MAX_REQUESTS` | `10` | Maximum requests allowed per IP per window |

**Lua script (`INCREMENT_SCRIPT`):**

Atomic Redis script that:
1. `INCR KEYS[1]` — increments the counter for the current window key. If the key doesn't exist, Redis creates it with value `1`.
2. `if current == 1` — first request in the window: set an expiry so the key auto-cleans.
3. `EXPIRE KEYS[1] ARGV[1]` — sets TTL to `WINDOW_SECONDS`.
4. Returns the current count.

Using Lua ensures INCR + EXPIRE are atomic — no race condition where a key gets created but never expires.

**`isRateLimited(ip: string): Promise<boolean>`:**

1. **Compute window key:** `Math.floor(Date.now() / 1000 / WINDOW_SECONDS)` produces a number constant for the entire 60s window, then increments — creating discrete time buckets.
2. **Build Redis key:** `ratelimit:validate-user:{ip}:{windowKey}` — unique per IP per window.
3. **Execute Lua script:** atomically increments and returns the count.
4. **Compare:** returns `true` if count exceeds `MAX_REQUESTS`.

### `ValidateUserRateLimitGuard` (`validate-user-rate-limit.guard.ts`)

NestJS `CanActivate` guard. Same pattern as `ApiKeyGuard` but keyed by IP instead of API key hash.

1. Extracts Express `Request` from NestJS `ExecutionContext`.
2. Resolves client IP via `request.ip ?? request.socket.remoteAddress ?? 'unknown'`.
3. Calls `rateLimiter.isRateLimited(ip)`.
4. Throws `HttpException(429)` if over limit, returns `true` otherwise.

### Rate Limit Rationale

| Parameter | Value | Reasoning |
|-----------|-------|-----------|
| Window | 60s | Long enough to smooth out bursts, short enough to recover quickly |
| Max requests | 10/min/IP | Covers normal UX (page load, tab-switch, retry) while blocking bulk enumeration |

At 10 req/min, an attacker can probe 600 UUIDs/hour/IP. Since user IDs are UUIDs (not sequential), enumeration is effectively infeasible even without the rate limit. The rate limit is defense-in-depth.

## Constraints

- Only non-invalidated users (`valid_to IS NULL`) can log in. A soft-deleted user's email lookup returns `null`, resulting in a 401.
- The raw password is never logged or stored at any point in the flow.

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `JWT_SECRET` | Yes | HMAC secret used to sign and verify JWTs |

---

## Sequence Diagram Description

A client sends a POST request to /auth/login with a JSON body containing email and password. AuthController receives the request and delegates to AuthService.login(). AuthService calls UserService.findByEmail() which queries the database for a user with that email where valid_to is null. If no user is found, AuthService throws an UnauthorizedException with the message "Invalid credentials". If a user is found, AuthService calls bcrypt.compare() with the provided password and the stored password_hash. If the hashes do not match, AuthService throws an UnauthorizedException with the same message. If the hashes match, AuthService calls JwtService.signAsync() with a payload of { sub: user.id, email: user.email } and the configured secret and 7-day expiry. The resulting JWT string is returned to the client wrapped in a TokenDto as { access_token: "<jwt>" }. For protected routes, JwtGuard intercepts the request, extracts the token from the Authorization header by splitting on space and taking the second part only if the first part is "Bearer", then calls JwtService.verifyAsync() with the JWT_SECRET from config. If verification succeeds, the decoded payload is attached to request.user and the route handler proceeds. If the header is missing, malformed, or verification throws (expired, wrong secret, tampered), JwtGuard throws an UnauthorizedException and the request is rejected.
