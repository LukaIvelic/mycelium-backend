# API Key Module

Handles API key listing, revocation, validation, and cache-backed lookup.

## Endpoints

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/api/api-keys` | Bearer JWT | Returns API keys for the current user across their projects. |
| `DELETE` | `/api/api-keys/:id` | Bearer JWT | Revokes a single API key if the caller owns it. |

## Service Functions

| Function | Visibility | Params | Returns | Description |
| --- | --- | --- | --- | --- |
| `validateApiKey` | public | `rawKey: string` | `Promise<ApiKey \| null>` | Validates a raw API key through bloom, local cache, Redis, and database lookup. |
| `checkBloom` | private | `hash: string` | `null \| undefined` | Short-circuits lookups when the bloom filter says the hash is absent. |
| `checkLocalCache` | private | `hash: string` | `ApiKey \| null \| undefined` | Reads a cached validation result from in-memory cache. |
| `checkRedisCache` | private | `hash: string` | `Promise<ApiKey \| null \| undefined>` | Reads Redis and warms the local cache on hit. |
| `checkDatabase` | private | `hash: string` | `Promise<ApiKey \| null>` | Queries the database and writes the result back to both caches. |
| `hash` | private | `rawKey: string` | `string` | Produces the SHA-256 hash used for lookup and storage checks. |
| `createApiKey` | public | `projectId: string, name?: string` | `Promise<{ key: string; message: string; entity: PublicApiKey }>` | Creates a new active API key for a project. |
| `revokeApiKey` | public | `apiKeyId: string, userId: string` | `Promise<void>` | Revokes an API key after checking ownership. |
| `getProjectByApiKeyId` | public | `apiKeyId: string` | `Promise<Project>` | Resolves the project attached to an API key. |
| `findByUserId` | public | `userId: string` | `Promise<PublicApiKey[]>` | Lists active API keys owned by a user. |
| `hasActiveApiKeyForProject` | public | `projectId: string` | `Promise<boolean>` | Checks whether a project has an active API key. |
| `countActiveKeysForUser` | public | `userId: string` | `Promise<number>` | Counts active API keys across all of a user's projects. |
