# Log Detail Schema

Extended payload data for a log entry, stored separately for query performance.

| Column | Type | Description |
|--------|------|-------------|
| log_id | uuid NOT NULL | PK and FK → logs.id |
| body_size_kb | double precision NOT NULL | Size of the request body in kilobytes |
| content_length | integer NOT NULL | Content-Length header value |
| content_type | text NOT NULL | Content-Type header value |
| body | text | Raw request body (null if not captured) |
| headers | jsonb NOT NULL | Full request headers as key/value pairs |
| completed | boolean NOT NULL | Whether the request completed normally |
| aborted | boolean NOT NULL | Whether the request was aborted mid-flight |
| idempotent | boolean NOT NULL | Whether the request is safe to retry |
