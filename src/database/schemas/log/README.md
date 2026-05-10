# Log Schema

Individual HTTP request/response records captured per project.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid NOT NULL | Primary key |
| project_id | uuid NOT NULL | FK → projects.id |
| api_key_id | uuid NOT NULL | FK → api_keys.id |
| trace_id | text NOT NULL | Distributed trace identifier |
| span_id | text NOT NULL | Span identifier within the trace |
| parent_span_id | text | Parent span, if part of a trace tree |
| integration_key | text | Short identifier of the originating integration |
| integration_name | text | Display name of the originating integration |
| integration_version | text | Version string of the originating integration |
| integration_description | text | Description of the originating integration |
| integration_origin | text | Base URL of the originating integration |
| method | text NOT NULL | HTTP method (GET, POST, etc.) |
| path | text NOT NULL | Request path |
| origin | text NOT NULL | Request origin header value |
| protocol | text NOT NULL | HTTP protocol version |
| status_code | integer NOT NULL | HTTP response status code |
| duration_ms | integer NOT NULL | Total request duration in milliseconds |
| timestamp | timestamptz NOT NULL | When the request was received |
| created_at | timestamptz NOT NULL | When the log record was inserted |
