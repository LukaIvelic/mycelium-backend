# User Module

Handles user CRUD, self-access checks, and public user shaping.

## Endpoints

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/api/users/me` | Bearer JWT | Returns the currently authenticated user. |
| `GET` | `/api/users/:id` | Bearer JWT | Returns the caller's own user record. |
| `POST` | `/api/users` | None | Creates a new user record. |
| `PATCH` | `/api/users/:id` | Bearer JWT | Updates the caller's own user record. |
| `DELETE` | `/api/users/:id` | Bearer JWT | Soft-deletes the caller's own user record. |

## Service Functions

| Function | Visibility | Params | Returns | Description |
| --- | --- | --- | --- | --- |
| `findOne` | public | `id: string` | `Promise<PublicUserResponse>` | Loads one active user and maps it to the public response shape. |
| `findByEmail` | public | `email: string` | `Promise<User \| null>` | Finds an active user by email address. |
| `create` | public | `dto: CreateUserDto` | `Promise<PublicUserResponse>` | Creates a user with a hashed password. |
| `update` | public | `id: string, dto: UpdateUserDto` | `Promise<PublicUserResponse>` | Updates a user and re-hashes the password when provided. |
| `delete` | public | `id: string` | `Promise<void>` | Soft-deletes a user by setting `validTo`. |
| `validate` | private | `dto: UpdateUserDto` | `void` | Ensures an update payload contains at least one defined field. |
