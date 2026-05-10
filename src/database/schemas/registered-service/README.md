# Registered Service Schema

Services discovered and registered under a project via an API key.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid NOT NULL | Primary key |
| project_id | uuid NOT NULL | FK → projects.id |
| api_key_id | uuid NOT NULL | FK → api_keys.id |
| service_origin | text NOT NULL | Raw origin URL of the service |
| normalized_origin | text NOT NULL | Canonicalized origin used for deduplication |
| service_key | text | Short identifier for the service |
| service_name | text | Display name of the service |
| service_version | text | Version string of the service |
| service_description | text | Description of the service |
| service_repository | text | Source repository URL |
| created_at | timestamptz NOT NULL | When the service was first registered |
| updated_at | timestamptz NOT NULL | When the service record was last updated |
