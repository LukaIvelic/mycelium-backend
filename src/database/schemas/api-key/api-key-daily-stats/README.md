# API Key Daily Stats Schema

Aggregated per-day usage metrics for each API key.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid NOT NULL | Composite PK (with api_key_id) — represents the day |
| api_key_id | uuid NOT NULL | Composite PK — FK → api_keys.id |
| total_requests | integer NOT NULL | Total requests on this day |
| successful_requests | integer NOT NULL | Requests with 2xx status |
| error_requests | integer NOT NULL | Requests with 4xx/5xx status |
| average_latency_ms | integer NOT NULL | Mean response time in ms |
| p95_latency_ms | integer NOT NULL | 95th percentile response time in ms |
| total_bytes_in | integer NOT NULL | Total inbound payload bytes |
| total_bytes_out | integer NOT NULL | Total outbound payload bytes |
| unique_ips | integer NOT NULL | Number of distinct client IPs |
