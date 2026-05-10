# Log Module

Accepts incoming SDK logs and exposes project log listing.

## Endpoints

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `POST` | `/api/logs` | `x-api-key` header | Creates a log entry and related log detail. |
| `GET` | `/api/logs?projectId=...&limit=...&offset=...` | Bearer JWT | Lists logs for a project owned by the caller. |

## Service Functions

| Function | Visibility | Params | Returns | Description |
| --- | --- | --- | --- | --- |
| `create` | public | `projectId: string, apiKeyId: string, dto: CreateLogDto` | `Promise<Log>` | Creates a log, upserts its integration, and writes log detail in one transaction. |
| `findByProjectId` | public | `projectId: string, userId: string, limit = 100, offset = 0` | `Promise<Log[]>` | Lists logs for a project after ownership verification. |
