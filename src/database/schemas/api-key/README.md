# API Key Schema

API keys issued to projects for authenticating inbound requests.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid NOT NULL | Primary key |
| name | text NOT NULL | Human-readable label for the key |
| project_id | uuid NOT NULL | FK → projects.id |
| key_prefix | text NOT NULL | First 8 chars of the key, shown in UI |
| key_hash | text NOT NULL | SHA-256 hash of the full key |
| valid_from | timestamptz NOT NULL | When the key became active |
| valid_to | timestamptz | Expiry timestamp (null = no expiry) |
| revoked_at | timestamptz | When the key was manually revoked |
| created_at | timestamptz NOT NULL | When the key was created |
| last_used_at | timestamptz NOT NULL | Most recent successful use |
| last_used_ip | text | IP address of the last request (inet) |
| usage_count | bigint NOT NULL | Total number of requests made |
| rate_limit_per_minute | integer NOT NULL | Max allowed requests per minute |
| metadata | jsonb | Arbitrary key/value data attached to the key |
