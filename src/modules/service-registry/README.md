# Service Registry Module

Registers service origins per project so the backend can resolve `origin -> service` on the first observed call instead of waiting for the callee to emit a later log.

## Purpose

The original log payload already carried enough information to identify the **caller**:

- `serviceKey`
- `serviceName`
- `serviceOrigin`

But it only carried one piece of information about the **callee**:

- `origin`

That meant a first outbound request looked like:

```json
{
  "serviceKey": "m1",
  "serviceName": "Sentence Service",
  "serviceOrigin": "http://localhost:3003",
  "origin": "http://localhost:3002"
}
```

The backend could confidently say:

- "Sentence Service made this request"

But it could not confidently say:

- "the target was Flower Service"

until a later log from Flower Service taught it that `http://localhost:3002` belonged to that service.

This module fixes that gap by introducing a project-scoped registry of known service origins and then letting the graph builder resolve target origins against that registry.

## Design Goals

The implementation was intentionally kept small:

- reuse the existing `x-api-key` flow for project scoping
- do not introduce a second auth model
- do not make `serviceKey` the canonical identity
- resolve targets only by exact normalized origin match
- never guess across projects
- never fall back to fuzzy matching

The result is:

- services self-register their `serviceOrigin`
- the registry stores one unique normalized origin per project
- React Flow can turn an outbound call into `Service A -> Service B` immediately

## What Changed

The feature is spread across three places:

1. **SDK registration**
2. **backend registry**
3. **graph resolution**

### 1. SDK registration

At SDK init time, and again as a safety net before the first log write, the SDK posts a registration payload:

```ts
await fetch(SERVICE_REGISTER_ENDPOINT, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
  },
  body: JSON.stringify({
    serviceOrigin: service.origin,
    serviceKey: service.key,
    serviceName: service.name,
    serviceVersion: service.version,
    serviceDescription: service.description,
  }),
});
```

Relevant files:

- `mycelium_sdk/src/lib/utils/ensure-service-registered.ts`
- `mycelium_sdk/src/setup/client.ts`
- `mycelium_sdk/src/lib/logging/network/fetch-logger.ts`
- `mycelium_sdk/src/lib/logging/network/http-logger.ts`

### 2. Backend registry

The backend accepts `POST /api/services/register`, validates `x-api-key`, derives `project_id`, normalizes the origin, and upserts a registry row.

Relevant files:

- [`service-registry.controller.ts`](./service-registry.controller.ts)
- [`service-registry.service.ts`](./service-registry.service.ts)
- [`registered-service.entity.ts`](./registered-service.entity.ts)
- [`normalize-origin.ts`](./normalize-origin.ts)

### 3. Graph resolution

The React Flow builder loads all registered services for the project, seeds them as nodes, and then resolves every log target origin by exact normalized match.

Relevant files:

- `../react-flow/react-flow.service.ts`
- `../react-flow/react-flow.controller.ts`

## Data Model

### [`RegisteredService`](./registered-service.entity.ts)

| Column | Type | Purpose |
| --- | --- | --- |
| `id` | `uuid` | Stable backend-generated service identity |
| `project_id` | `uuid` | Project scope |
| `api_key_id` | `uuid` | Last API key that registered or refreshed the row |
| `service_origin` | `text` | Raw origin sent by the SDK |
| `normalized_origin` | `text` | Canonical lookup key |
| `service_key` | `varchar(255)` | Optional SDK metadata |
| `service_name` | `varchar(255)` | Optional SDK metadata |
| `service_version` | `varchar(255)` | Optional SDK metadata |
| `service_description` | `text` | Optional SDK metadata |
| `created_at` | `timestamptz` | First registration time |
| `updated_at` | `timestamptz` | Last refresh time |

Constraint:

- unique `(project_id, normalized_origin)`

That uniqueness is the entire point. Inside one project, one normalized origin must resolve to exactly one registered service.

## Why `serviceKey` Is Not the Real Identity

The backend uses the row `id` as the durable identity.

That choice matters because:

- `serviceKey` is user-defined
- `serviceKey` can change
- typos happen
- names and labels are metadata, not identity

So the rule is:

- `RegisteredService.id` is the canonical identity
- `serviceKey` and `serviceName` are metadata
- `normalized_origin` is the lookup key that helps us find the service

## Trust Model

The registry does **not** trust a client-supplied project id.

It uses the exact same trust boundary as log ingestion:

1. SDK sends `x-api-key`
2. `ApiKeyGuard` validates it
3. backend derives `project_id` from the `ApiKey` entity
4. registry row is created inside that project

That means resolution is always project-local.

No cross-project matching is allowed.

## Origin Normalization

Origins are normalized before they become lookup keys.

Current rules:

```ts
export function normalizeOrigin(origin: string): string {
  const trimmed = origin.trim();
  if (!trimmed) return '';

  try {
    const url = new URL(trimmed);
    const protocol = url.protocol.toLowerCase();
    const hostname = url.hostname.toLowerCase();
    const port = shouldKeepPort(protocol, url.port) ? `:${url.port}` : '';

    return `${protocol}//${hostname}${port}`;
  } catch {
    return trimmed.replace(/\/+$/, '');
  }
}
```

Normalization guarantees that equivalent values like:

- `http://localhost:3002/`
- `http://LOCALHOST:3002`

collapse to the same lookup key.

Current behavior:

- lowercase scheme and hostname
- strip trailing slash
- drop default port for `http:80` and `https:443`
- keep non-default ports

## Registration Flow

### Happy path

```text
Service boots
-> SDK knows service origin and metadata
-> SDK POSTs /api/services/register with x-api-key
-> ApiKeyGuard validates key
-> backend derives project_id
-> backend normalizes origin
-> backend upserts RegisteredService(project_id, normalized_origin)
```

### Controller

The controller stays intentionally thin:

```ts
@Post('register')
@UseGuards(ApiKeyGuard)
async register(
  @Body() dto: RegisterServiceDto,
  @Req() request: Request,
): Promise<RegisteredService> {
  const apiKey = request['apiKey'] as ApiKey;
  return this.serviceRegistryService.register(
    apiKey.project_id,
    apiKey.id,
    dto,
  );
}
```

### Service

The service uses atomic upsert rather than `findOne + save`:

```ts
await this.registeredServiceRepository.upsert(
  {
    project_id: projectId,
    api_key_id: apiKeyId,
    service_origin: dto.serviceOrigin,
    normalized_origin: normalizedOrigin,
    service_key: dto.serviceKey ?? null,
    service_name: dto.serviceName ?? null,
    service_version: dto.serviceVersion ?? null,
    service_description: dto.serviceDescription ?? null,
    updated_at: new Date(),
  },
  ['project_id', 'normalized_origin'],
);
```

That change is important because startup registration and log-time backfill can happen close together. Without an atomic upsert, those two paths can race each other and throw a unique-constraint error.

## Why There Is Also Log-Time Backfill

The original intent was:

- register on startup
- use the registry during graph building

That works only if startup registration always succeeds before traffic starts flowing.

In practice, the safer design is:

- try explicit startup registration
- still backfill the registry from every incoming log write

The log path now does this first:

```ts
if (dto.serviceOrigin?.trim()) {
  await this.serviceRegistryService.register(projectId, apiKeyId, {
    serviceOrigin: dto.serviceOrigin,
    serviceKey: dto.serviceKey,
    serviceName: dto.serviceName,
    serviceVersion: dto.serviceVersion,
    serviceDescription: dto.serviceDescription,
  });
}
```

This means:

- even if `POST /services/register` fails or is delayed
- the next real log from that service still teaches the backend who it is

That made the system far more robust without changing the public API.

## SDK Flow

The SDK uses a one-time shared registration helper:

```ts
const registrationRequests = new Map<string, Promise<void>>();

export function ensureServiceRegistered(
  service: Service,
  apiKey: string,
): Promise<void> {
  const cacheKey = `${apiKey}:${service.origin}`;
  const existingRequest = registrationRequests.get(cacheKey);
  if (existingRequest) return existingRequest;

  const request = fetch(SERVICE_REGISTER_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify({
      serviceOrigin: service.origin,
      serviceKey: service.key,
      serviceName: service.name,
      serviceVersion: service.version,
      serviceDescription: service.description,
    }),
  });

  registrationRequests.set(cacheKey, request);
  return request;
}
```

And the SDK kicks that off in two places:

### At client initialization

```ts
void ensureServiceRegistered(this.serviceValue, this.apiKeyValue).catch(
  () => undefined,
);
```

### Before sending a log

```ts
try {
  await ensureServiceRegistered(this.service, this.apiKey);
} catch (err) {
  // swallow registration errors
}

try {
  await fetch(this.logEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': this.apiKey,
    },
    body: JSON.stringify(markedRequest),
  });
} catch (err) {
  // swallow log transport errors
}
```

That second split is deliberate.

Earlier, registration and log sending were inside one `try`, which meant:

- if registration failed
- the actual log post was skipped too

Separating those `try` blocks fixed that failure mode.

## Internal Endpoint Filtering

The SDK must not trace its own control-plane requests, otherwise registration and log shipping would recursively generate more logs.

The internal endpoint filter now excludes both:

- `/api/logs`
- `/api/services/register`

```ts
return candidates.some(
  (candidate) =>
    candidate.startsWith(LOG_ENDPOINT) ||
    candidate.startsWith(SERVICE_REGISTER_ENDPOINT),
);
```

## Graph Building

The graph builder now uses the registry as the source of truth for origin resolution.

### Step 1: load registered services

```ts
const registeredServices =
  await this.serviceRegistryService.findByProjectId(projectId);
const servicesByOrigin = new Map(
  registeredServices.map((service) => [service.normalized_origin, service]),
);
```

### Step 2: seed registered services as nodes

```ts
for (const service of servicesByOrigin.values()) {
  const node = this.resolveRegisteredServiceNode(service);
  nodes.set(node.id, { label: node.label });
}
```

That matters because the graph should not depend purely on "who already logged". If a service is known to the registry, it should be able to appear as a node even before it has become the source of an edge in the current graph snapshot.

### Step 3: resolve each log source

```ts
private resolveSourceNode(
  log: Log,
  servicesByOrigin: Map<string, RegisteredService>,
): { id: string; label: string } {
  const normalizedOrigin = normalizeOrigin(log.service_origin ?? '');
  const registeredService = normalizedOrigin
    ? servicesByOrigin.get(normalizedOrigin)
    : undefined;

  if (registeredService) {
    return this.resolveRegisteredServiceNode(registeredService);
  }

  return {
    id:
      log.service_key?.trim() ||
      log.service_name?.trim() ||
      normalizedOrigin ||
      'unknown-service',
    label:
      log.service_name?.trim() ||
      log.service_key?.trim() ||
      normalizedOrigin ||
      'Unknown service',
  };
}
```

### Step 4: resolve each target

```ts
private resolveTargetNode(
  normalizedOrigin: string,
  servicesByOrigin: Map<string, RegisteredService>,
): { id: string; label: string } {
  const registeredService = servicesByOrigin.get(normalizedOrigin);
  if (registeredService) {
    return this.resolveRegisteredServiceNode(registeredService);
  }

  return {
    id: `origin:${normalizedOrigin}`,
    label: normalizedOrigin,
  };
}
```

That is the exact moment where a raw `origin` becomes either:

- a resolved service node
- or an unresolved placeholder node

## Why Invalid Origins Are Ignored

While debugging this feature, one broken placeholder showed up:

```json
{
  "id": "origin:http:",
  "data": { "label": "http:" }
}
```

That came from accepting malformed or partial origins as graph targets.

The graph builder now rejects non-absolute target origins:

```ts
if (
  !targetOrigin ||
  !this.isAbsoluteOrigin(targetOrigin) ||
  (sourceOrigin && sourceOrigin === targetOrigin)
) {
  continue;
}
```

That check does three things:

- skips empty target origins
- skips malformed values like `http:`
- skips self-edges where source and target origins are the same

## Why React Flow Resyncs on Read

The graph is cached in the `react_flow` table.

That means a service can register after the last log-triggered sync and the cached graph can still be stale. To make the UI reflect fresh registrations quickly, the read endpoint now forces a resync before returning the graph.

In practice:

```ts
await this.reactFlowService.syncProjectGraph(projectId);
return this.reactFlowService.findByProject(projectId);
```

That keeps the behavior simple:

- registration happens
- next graph read sees it

## Full End-to-End Flow

### Startup

```text
m1 boots
-> SDK registers http://localhost:3003

m2 boots
-> SDK registers http://localhost:3002
```

### Request

```text
client calls m1 GET /
-> m1 logs inbound server request
-> m1 makes outbound fetch to http://localhost:3002
-> SDK logs outbound request with target origin=http://localhost:3002
-> m2 receives request and logs inbound server request
```

### Backend

```text
each log write
-> backfills service registry from caller metadata
-> stores log row
-> rebuilds project graph
```

### Graph

```text
source log row says caller origin = http://localhost:3003
target log field says origin = http://localhost:3002
registry says http://localhost:3002 -> Flower Service
graph edge becomes Sentence Service -> Flower Service
```

## File Map

### Backend

- [`registered-service.entity.ts`](./registered-service.entity.ts)
- [`service-registry.dto.ts`](./service-registry.dto.ts)
- [`service-registry.controller.ts`](./service-registry.controller.ts)
- [`service-registry.service.ts`](./service-registry.service.ts)
- [`service-registry.module.ts`](./service-registry.module.ts)
- [`normalize-origin.ts`](./normalize-origin.ts)
- `../log/log.service.ts`
- `../log/log.module.ts`
- `../react-flow/react-flow.service.ts`
- `../react-flow/react-flow.controller.ts`

### SDK

- `mycelium_sdk/src/lib/utils/ensure-service-registered.ts`
- `mycelium_sdk/src/setup/client.ts`
- `mycelium_sdk/src/lib/logging/network/fetch-logger.ts`
- `mycelium_sdk/src/lib/logging/network/http-logger.ts`
- `mycelium_sdk/src/lib/utils/is-internal-origin.ts`
- `mycelium_sdk/src/lib/constants.ts`

## Testing / Verification

The simplest manual verification loop is:

1. start backend
2. start `m1`
3. start `m2`
4. hit `GET /` on `m1`
5. verify `registered_service` contains both origins
6. fetch the React Flow graph

Expected shape:

```json
[
  {
    "id": "service:<m1-id>",
    "data": { "label": "Sentence Service" }
  },
  {
    "id": "service:<m2-id>",
    "data": { "label": "Flower Service" }
  }
]
```

And once the outbound request is present:

```json
[
  {
    "id": "service:<m1-id>->service:<m2-id>",
    "source": "service:<m1-id>",
    "target": "service:<m2-id>"
  }
]
```

## Known Limits

- A service is currently keyed by `(project_id, normalized_origin)`, which is enough for this feature but does not yet model one service with multiple origins.
- `serviceKey` is still required by the SDK setup flow even though the registry does not depend on it as identity.
- We still rely on observed traffic to produce edges. Registration gives us service nodes and target resolution, but not synthetic edges.
- In production, this entity should be introduced with a migration rather than `synchronize`.

## Summary

The feature works because three rules now hold at the same time:

1. every service origin is registered per project
2. every log write can refresh that registry
3. every graph build resolves target origins against that registry using exact normalized matching

That is the minimal change set that turned:

- "we know the caller and only a raw target origin"

into:

- "we know the caller, we know the callee, and we can draw the edge on the first meaningful request"
