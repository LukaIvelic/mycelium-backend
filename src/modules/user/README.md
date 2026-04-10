# User Module

## Directory Structure

```
user/
  user.controller.ts   GET / POST / PATCH / DELETE endpoints
  user.decorator.ts    Swagger operation decorators and UserResponse schema
  user.dto.ts          CreateUserDto and UpdateUserDto (PartialType)
  user.entity.ts       TypeORM User entity
  user.service.ts      CRUD logic, password hashing, soft-delete
  user.module.ts       Module registration with circular-dep forward ref
```

## Entity

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key, auto-generated |
| `first_name` | string | |
| `last_name` | string | |
| `email` | string | Unique constraint |
| `password_hash` | string | bcrypt hash, never returned in responses |
| `valid_from` | timestamp | Set to `CURRENT_TIMESTAMP` at creation |
| `valid_to` | timestamp \| null | `null` = active; set on soft-delete |
| `created_at` | timestamp | Set to `CURRENT_TIMESTAMP` at creation |
| `updated_at` | timestamp \| null | Set on every update |

`password_hash`, `first_name`, `last_name`, `email`, `valid_from`, `valid_to`, and `updated_at` are decorated with `@Exclude()` to prevent accidental serialization leaks; `id` and `created_at` are the only fields returned by default.

## Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/users` | Public | Create a new user |
| `GET` | `/users/:id` | JWT | Get a user by ID |
| `PATCH` | `/users/:id` | JWT | Update one or more user fields |
| `DELETE` | `/users/:id` | JWT | Soft-delete (invalidate) a user |

## Creation Flow

1. Client sends `POST /users` with `{ first_name, last_name, email, password }`.
2. Service checks for an existing record with the same email (including invalidated ones). If found, throws `409 Conflict`.
3. Hashes the password with `bcrypt.hash()` at 10 salt rounds.
4. Strips the raw `password` field and stores `password_hash` alongside the other fields.
5. Returns the saved entity. The raw password is never stored or logged.

## Update Flow

1. Client sends `PATCH /users/:id` with any subset of `{ first_name, last_name, email, password }` (all fields optional via `PartialType`).
2. Service builds a partial update object. If `password` is provided, it is hashed and stored as `password_hash`; the raw `password` field is deleted from the update object before the query runs.
3. `updated_at` is set to `new Date()` on every update.
4. Calls `findOne()` after the update to return the fresh entity (enforces `valid_to IS NULL` check — throws 404 if the user was invalidated between steps).

## Invalidation Flow (Soft Delete)

1. Client sends `DELETE /users/:id` with a valid JWT.
2. Service calls `findOne()` — throws `404 Not Found` if the user does not exist or is already invalidated.
3. Sets `valid_to = new Date()` and saves the record.
4. All subsequent reads filter by `valid_to IS NULL`, so the user is treated as non-existent in every future lookup (including login).
5. Returns `204 No Content`.

There is no hard delete. Invalidated records remain in the database with `valid_to` set.

## Password Handling

- Raw passwords are accepted only in `CreateUserDto` and `UpdateUserDto`.
- They are hashed with `bcrypt` (10 salt rounds) immediately and never persisted in plaintext.
- `password_hash` is excluded from all serialized responses via `@Exclude()`.

## Email Uniqueness

Enforced at two levels:
1. **Application level:** `create()` checks for any existing record (including invalidated users) with the same email before inserting. Throws `409 Conflict`.
2. **Database level:** The `email` column has a `UNIQUE` constraint.

Invalidated users' emails are not released — a soft-deleted user's email cannot be reused.

## Module Dependencies

`UserModule` and `AuthModule` have a circular dependency (`UserController` needs `JwtGuard` from `AuthModule`; `AuthService` needs `UserService`). This is resolved with `forwardRef(() => AuthModule)` in `UserModule`.

`UserModule` exports `UserService` so `AuthModule` can call `findByEmail()` during login.

## Environment Variables

This module has no environment variables of its own. It relies on the database connection configured in the root `TypeOrmModule`.

---

## Sequence Diagram Description

For user creation, a client sends POST /users with a body containing first_name, last_name, email, and password. UserController delegates to UserService.create(). The service queries the database for any existing record with that email; if one exists (active or invalidated), it throws a ConflictException with "Email already in use". Otherwise it calls bcrypt.hash() with the plain password and 10 salt rounds to produce a password_hash, removes the raw password field from the data object, creates the entity, saves it to the database, and returns the saved User entity. For reading a user, a JWT-protected GET /users/:id request arrives, JwtGuard verifies the Bearer token and attaches the decoded payload to request.user, then UserController calls UserService.findOne() which queries the database for a user with the given id where valid_to is null. If found, it returns the entity; if not, it throws NotFoundException. For updating a user, a JWT-protected PATCH /users/:id request arrives with a partial body. UserService builds a data object from the provided fields, sets updated_at to now, and if a new password is included, hashes it and replaces the password field with password_hash. It calls userRepository.update() then userRepository.findOneBy() to return the refreshed entity. For soft-deletion, a JWT-protected DELETE /users/:id request arrives. UserService calls findOne() to confirm the user exists and is active, then sets valid_to to the current timestamp and saves the record. All subsequent lookups filter on valid_to IS NULL so the user appears non-existent everywhere in the system.
