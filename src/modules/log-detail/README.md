# Log Detail Module

Stores and retrieves extended request and payload details for logs.

## Endpoints

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/api/log-details/:logId` | Bearer JWT | Returns body, headers, and flags for a single log. |

## Service Functions

| Function | Visibility | Params | Returns | Description |
| --- | --- | --- | --- | --- |
| `create` | public | `tx: Database, logId: string, dto: CreateLogDetailDto` | `Promise<void>` | Inserts the detail row for a log inside an existing transaction. |
| `findOne` | public | `logId: string, userId: string` | `Promise<LogDetail>` | Returns one log detail after checking project ownership. |
