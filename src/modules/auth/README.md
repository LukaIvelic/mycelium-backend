# Auth Module

Handles signup, login, JWT issuance, and email-existence checks.

## Endpoints

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `POST` | `/api/authentication/signup` | None | Creates a new user account and returns a JWT. |
| `POST` | `/api/authentication/login` | None | Authenticates a user and returns a JWT. |
| `POST` | `/api/authentication/token` | None | Hidden Swagger OAuth token endpoint. |
| `GET` | `/api/authentication/validate?email=...` | None | Returns whether an email is already registered. |

## Service Functions

| Function | Visibility | Params | Returns | Description |
| --- | --- | --- | --- | --- |
| `login` | public | `email: string, password: string` | `Promise<TokenDto>` | Verifies credentials and signs a JWT. |
| `signup` | public | `firstName: string, lastName: string, email: string, password: string` | `Promise<TokenDto>` | Creates a user and signs a JWT. |
| `validateUser` | public | `email: string` | `Promise<{ exists: boolean }>` | Checks whether a user exists for an email address. |
