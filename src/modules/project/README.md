# Project Module

Handles project CRUD, ownership checks, project discovery, and project API key attachment.

## Endpoints

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/api/projects` | Bearer JWT | Lists the current user's projects, optionally filtered by `hasApiKey`. |
| `GET` | `/api/projects/:id` | Bearer JWT | Returns one owned project. |
| `GET` | `/api/projects/:id/has-api-key` | Bearer JWT | Returns whether the project has an active API key. |
| `GET` | `/api/projects/by-api-key?apiKeyId=...` | Bearer JWT | Returns the project that owns a given API key. |
| `POST` | `/api/projects` | Bearer JWT | Creates a new project. |
| `PATCH` | `/api/projects/:id` | Bearer JWT | Updates an owned project. |
| `DELETE` | `/api/projects/:id` | Bearer JWT | Soft-deletes an owned project. |
| `POST` | `/api/projects/:id/api-key` | Bearer JWT | Creates a new API key for an owned project. |

## Service Functions

| Function | Visibility | Params | Returns | Description |
| --- | --- | --- | --- | --- |
| `findOne` | public | `id: string, userId: string` | `Promise<Project>` | Loads one active project and verifies ownership. |
| `hasActiveApiKey` | public | `project: Project` | `Promise<boolean>` | Checks whether a project has an active API key. |
| `findByUserId` | public | `userId: string, hasApiKey?: boolean` | `Promise<Project[]>` | Lists active projects for a user with an optional API-key filter. |
| `findByApiKeyId` | public | `apiKeyId: string, userId: string` | `Promise<Project>` | Resolves the project behind an API key and verifies ownership. |
| `create` | public | `dto: CreateProjectDto, userId: string` | `Promise<Project>` | Creates a new project for a user. |
| `update` | public | `project: Project, dto: UpdateProjectDto` | `Promise<Project>` | Updates an existing project. |
| `delete` | public | `project: Project` | `Promise<void>` | Soft-deletes a project by setting `validTo`. |
| `addApiKeyToProject` | public | `project: Project, name?: string` | `Promise<AddApiKeyToProjectResponse>` | Creates a project API key if the user's global limit allows it. |
| `validate` | private | `dto: UpdateProjectDto` | `void` | Ensures an update payload contains at least one defined field. |
