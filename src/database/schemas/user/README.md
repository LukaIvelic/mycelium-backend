# User Schema

Stores user identity and authentication credentials.

## `user`

| Column | Type | Description |
|--------|------|-------------|
| id | uuid NOT NULL | Primary key |
| email | text NOT NULL | Unique login identifier |
| password_hash | text NOT NULL | Bcrypt hash of the user's password |
| created_at | timestamptz | When the account was created |
| valid_to | timestamptz | Soft-delete timestamp |
