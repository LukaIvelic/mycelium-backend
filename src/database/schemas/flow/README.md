# Flow Schema

Stores the canvas state (nodes and edges) for a project's integration map.

| Column | Type | Description |
| ------ | ---- | ----------- |
| id | uuid NOT NULL | Primary key |
| project_id | uuid NOT NULL | FK to projects.id (unique per project) |
| signature | text NOT NULL | Hash of the current graph state for change detection |
| nodes | jsonb NOT NULL | Serialized node definitions |
| edges | jsonb NOT NULL | Serialized edge definitions |
