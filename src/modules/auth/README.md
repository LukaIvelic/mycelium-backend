# Auth Module

## Directory Structure

```
auth/
  auth.controller.ts   POST /auth/login endpoint
  auth.dto.ts          LoginDto (request) and TokenDto (response)
  auth.service.ts      Credential validation and JWT issuance
  jwt.guard.ts         NestJS guard for Bearer token verification
  auth.module.ts       Module registration with circular-dep forward ref
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
