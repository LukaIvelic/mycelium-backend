# API Key Stats Module

Tracks and reads API key usage statistics.

## Endpoints

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/api/api-key-stats/:apiKeyId` | Bearer JWT | Returns API key usage stats for an owned API key. |

## Service Functions

| Function | Visibility | Params | Returns | Description |
| --- | --- | --- | --- | --- |
| `trackLogIngest` | public | `apiKeyId: string, log: Log, request: ApiKeyStatsRequest, tx?: Database` | `Promise<void>` | Updates API key usage counters during log ingestion. |
| `findByApiKeyId` | public | `apiKeyId: string, userId: string` | `Promise<ApiKeyStatsDto>` | Returns per-IP stats and average latency for an API key. |
| `extractIp` | private | `request: ApiKeyStatsRequest` | `string` | Extracts the client IP from request metadata. |
| `extractCountry` | private | `request: ApiKeyStatsRequest, ip: string` | `Promise<{ country: string; detailed: IpApiDetails \| null }>` | Extracts the country from common platform headers or resolves it from the IP API. |
| `findCountryByIp` | private | `ip: string` | `Promise<IpApiDetails \| null>` | Resolves IP location details from the external IP API. |
| `getHeader` | private | `request: ApiKeyStatsRequest, name: string` | `string \| undefined` | Reads a normalized request header. |
