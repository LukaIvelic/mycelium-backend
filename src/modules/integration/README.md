# Integration Module

Stores discovered integrations and exposes integration lookup by ID.

## Endpoints

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/api/integrations/:integrationId` | Bearer JWT | Returns a single integration after checking project ownership. |

## Service Functions

| Function | Visibility | Params | Returns | Description |
| --- | --- | --- | --- | --- |
| `upsertFromLog` | public | `projectId: string, apiKeyId: string, metadata: IntegrationMetadata, tx?: Database` | `Promise<Integration>` | Inserts or updates an integration from incoming log metadata. |
| `findById` | public | `id: string` | `Promise<Integration>` | Loads one integration by ID. |
| `normalizeOrigin` | private | `origin: string` | `string` | Normalizes integration origins for uniqueness checks. |
