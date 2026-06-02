# User Profile Module

Handles user profile lookup, profile updates, and generated usernames.

## Endpoints

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/api/user-profiles/me` | Bearer JWT | Returns the currently authenticated user's profile. |
| `GET` | `/api/user-profiles/:id` | Bearer JWT | Returns the caller's own user profile. |
| `PATCH` | `/api/user-profiles/:id` | Bearer JWT | Updates the caller's own user profile. |

## Service Functions

| Function | Visibility | Params | Returns | Description |
| --- | --- | --- | --- | --- |
| `findOne` | public | `userId: string` | `Promise<UserProfile>` | Loads one user profile. |
| `create` | public | `userId: string, firstName: string, lastName: string, email: string` | `Promise<UserProfile>` | Creates a profile with a generated username. |
| `update` | public | `userId: string, values: UpdateUserProfileDto` | `Promise<UserProfile>` | Updates profile fields. |
| `generateUniqueUsername` | private | `firstName: string, lastName: string` | `Promise<string>` | Generates a unique username from profile names. |
| `normalizeUsernamePart` | private | `value: string` | `string` | Normalizes a name segment for username generation. |
| `validate` | private | `dto: UpdateUserProfileDto` | `void` | Ensures an update payload contains at least one defined field. |
