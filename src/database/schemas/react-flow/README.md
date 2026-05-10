# React Flow Schema

Stores the React Flow canvas state (nodes and edges) for a project's service map.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid NOT NULL | Primary key |
| project_id | uuid NOT NULL | FK → projects.id (unique per project) |
| signature | text NOT NULL | Hash of the current graph state for change detection |
| nodes | jsonb NOT NULL | Serialized React Flow node definitions |
| edges | jsonb NOT NULL | Serialized React Flow edge definitions |
