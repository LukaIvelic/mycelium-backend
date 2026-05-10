# Project Schema

A workspace owned by a user that groups API keys, logs, and services.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid NOT NULL | Primary key |
| name | text NOT NULL | Display name of the project |
| description | text | Optional project description |
| user_id | uuid NOT NULL | FK → users.id |
| valid_from | timestamptz NOT NULL | Start of the active period |
| valid_to | timestamptz | End of the active period (null = active) |
| created_at | timestamptz NOT NULL | When the project was created |
| updated_at | timestamptz | When the project was last updated |
