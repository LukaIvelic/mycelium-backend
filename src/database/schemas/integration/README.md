# Integration Schema

Integrations discovered under a project via an API key.

| Column | Type | Description |
| ------ | ---- | ----------- |
| id | uuid NOT NULL | Primary key |
| project_id | uuid NOT NULL | FK to projects.id |
| api_key_id | uuid NOT NULL | FK to api_keys.id |
| origin | text NOT NULL | Raw origin URL |
| normalized_origin | text NOT NULL | Canonicalized origin used for deduplication |
| key | text | Short identifier |
| name | text | Display name |
| version | text | Version string |
| description | text | Description |
| repository | text | Source repository URL |
| created_at | timestamptz NOT NULL | When the integration was first discovered |
| updated_at | timestamptz NOT NULL | When the integration record was last updated |
