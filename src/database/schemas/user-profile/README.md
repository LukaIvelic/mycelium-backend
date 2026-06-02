# User Profile Schema

Stores user profile metadata.

## `user_profile`

| Column | Type | Description |
|--------|------|-------------|
| user_id | uuid NOT NULL | One-to-one foreign key to `user.id` |
| first_name | text | Optional given name |
| last_name | text | Optional family name |
| username | text | Optional public handle, unique when present |
| random_profile_hex | text | Random profile color in hex format |
| email | text | Optional public/contact email |
| bio | text | Optional profile bio |
| job_title | text | Optional role or title |
| company | text | Optional company or organization |
| location | text | Optional location string |
| avatar_url | text | Optional avatar image URL |
| created_at | timestamptz NOT NULL | When the profile row was created |
| updated_at | timestamptz NOT NULL | When the profile row was last updated |
