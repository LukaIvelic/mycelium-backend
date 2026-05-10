# Flow Module

Builds and stores project flow graphs derived from logs and integrations.

## Endpoints

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/api/flows/:projectId` | Bearer JWT | Rebuilds the project's flow graph and returns the stored flow snapshot. |

## Service Functions

| Function | Visibility | Params | Returns | Description |
| --- | --- | --- | --- | --- |
| `syncProjectFlow` | public | `projectId: string` | `Promise<void>` | Rebuilds the project's flow graph from live data and persists it. |
| `findByProjectId` | public | `projectId: string` | `Promise<FlowDto>` | Loads the stored flow graph for a project. |
| `createSignature` | private | `graph: FlowDto` | `string` | Creates a stable SHA-256 signature for normalized graph data. |
| `upsertProjectFlow` | private | `projectId: string, graph: FlowDto` | `Promise<void>` | Inserts or updates the stored flow when its signature changes. |
