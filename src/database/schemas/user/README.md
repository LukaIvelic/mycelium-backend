# User Schema

Stores user accounts and authentication credentials.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid NOT NULL | Primary key |
| first_name | text | User's first name |
| last_name | text | User's last name |
| email | text NOT NULL | Unique login identifier |
| password_hash | text NOT NULL | Bcrypt hash of the user's password |
| created_at | timestamptz | When the account was created |
