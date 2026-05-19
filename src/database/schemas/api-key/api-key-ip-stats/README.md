# API Key IP Stats Schema

Per-IP usage statistics for each API key.

| Column | Type | Description |
|--------|------|-------------|
| api_key_id | uuid NOT NULL | Composite PK — FK → api_keys.id |
| ip | text NOT NULL | Composite PK — client IP address (inet) |
| first_seen | timestamptz NOT NULL | First request from this IP |
| last_seen | timestamptz NOT NULL | Most recent request from this IP |
| request_count | integer NOT NULL | Total requests from this IP |
| country | text NOT NULL | Resolved country of the IP |
| detailed | jsonb | Full IP lookup payload when resolved from the external IP API |
