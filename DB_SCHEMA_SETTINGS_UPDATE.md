# Settings Schema Update

This update keeps general settings on the existing `project` and `integration` tables, then adds normalized one-to-one tables for the two new concerns: performance and communication. Table names are singular to match the existing schema style.

## Apply

```sql
DO $$
BEGIN
  CREATE TYPE communication_header_filter_level AS ENUM (
    'HIGH',
    'MEDIUM',
    'METADATA',
    'ALL'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS project_performance_setting (
  project_id uuid PRIMARY KEY REFERENCES "project"(id) ON DELETE CASCADE,
  capture_metrics boolean NOT NULL DEFAULT false,
  slow_request_threshold_ms integer NOT NULL DEFAULT 1000,
  notify_on_slow_requests boolean NOT NULL DEFAULT true,
  notify_on_failed_requests boolean NOT NULL DEFAULT true,
  warning_status_code integer NOT NULL DEFAULT 400,
  critical_status_code integer NOT NULL DEFAULT 500,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT project_performance_settings_slow_request_threshold_check
    CHECK (slow_request_threshold_ms >= 0),
  CONSTRAINT project_performance_settings_warning_status_code_check
    CHECK (warning_status_code BETWEEN 100 AND 599),
  CONSTRAINT project_performance_settings_critical_status_code_check
    CHECK (critical_status_code BETWEEN 100 AND 599),
  CONSTRAINT project_performance_settings_status_code_order_check
    CHECK (warning_status_code <= critical_status_code)
);

CREATE TABLE IF NOT EXISTS project_communication_setting (
  project_id uuid PRIMARY KEY REFERENCES "project"(id) ON DELETE CASCADE,
  subscribe_to_fetch boolean NOT NULL DEFAULT false,
  subscribe_to_http boolean NOT NULL DEFAULT false,
  capture_body boolean NOT NULL DEFAULT false,
  body_max_bytes integer NOT NULL DEFAULT 0,
  capture_stream_bodies boolean NOT NULL DEFAULT false,
  header_filter_level communication_header_filter_level NOT NULL DEFAULT 'HIGH',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT project_communication_settings_body_max_bytes_check
    CHECK (body_max_bytes >= 0)
);

CREATE TABLE IF NOT EXISTS integration_performance_setting (
  integration_id uuid PRIMARY KEY REFERENCES integration(id) ON DELETE CASCADE,
  capture_metrics boolean NOT NULL DEFAULT false,
  slow_request_threshold_ms integer NOT NULL DEFAULT 1000,
  notify_on_slow_requests boolean NOT NULL DEFAULT true,
  notify_on_failed_requests boolean NOT NULL DEFAULT true,
  warning_status_code integer NOT NULL DEFAULT 400,
  critical_status_code integer NOT NULL DEFAULT 500,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT integration_performance_settings_slow_request_threshold_check
    CHECK (slow_request_threshold_ms >= 0),
  CONSTRAINT integration_performance_settings_warning_status_code_check
    CHECK (warning_status_code BETWEEN 100 AND 599),
  CONSTRAINT integration_performance_settings_critical_status_code_check
    CHECK (critical_status_code BETWEEN 100 AND 599),
  CONSTRAINT integration_performance_settings_status_code_order_check
    CHECK (warning_status_code <= critical_status_code)
);

CREATE TABLE IF NOT EXISTS integration_communication_setting (
  integration_id uuid PRIMARY KEY REFERENCES integration(id) ON DELETE CASCADE,
  subscribe_to_fetch boolean NOT NULL DEFAULT false,
  subscribe_to_http boolean NOT NULL DEFAULT false,
  capture_body boolean NOT NULL DEFAULT false,
  body_max_bytes integer NOT NULL DEFAULT 0,
  capture_stream_bodies boolean NOT NULL DEFAULT false,
  header_filter_level communication_header_filter_level NOT NULL DEFAULT 'HIGH',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT integration_communication_settings_body_max_bytes_check
    CHECK (body_max_bytes >= 0)
);

CREATE TABLE IF NOT EXISTS project_region_setting (
  project_id uuid PRIMARY KEY REFERENCES "project"(id) ON DELETE CASCADE,
  primary_region text NOT NULL DEFAULT 'EU Central',
  data_residency text NOT NULL DEFAULT 'European Union',
  failover_region text NOT NULL DEFAULT 'EU West',
  timezone text NOT NULL DEFAULT 'Europe/Zagreb',
  date_format text NOT NULL DEFAULT 'DD/MM/YYYY',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT project_region_settings_primary_region_length_check
    CHECK (char_length(primary_region) <= 64),
  CONSTRAINT project_region_settings_data_residency_length_check
    CHECK (char_length(data_residency) <= 64),
  CONSTRAINT project_region_settings_failover_region_length_check
    CHECK (char_length(failover_region) <= 64),
  CONSTRAINT project_region_settings_timezone_length_check
    CHECK (char_length(timezone) <= 64),
  CONSTRAINT project_region_settings_date_format_length_check
    CHECK (char_length(date_format) <= 32)
);

CREATE TABLE IF NOT EXISTS user_notification_setting (
  user_id uuid PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
  product_updates boolean NOT NULL DEFAULT true,
  workspace_activity boolean NOT NULL DEFAULT true,
  security_notices boolean NOT NULL DEFAULT true,
  daily_digest_time text NOT NULL DEFAULT '09:00',
  weekly_report_day text NOT NULL DEFAULT 'Friday',
  quiet_hours_start text NOT NULL DEFAULT '22:00',
  quiet_hours_end text NOT NULL DEFAULT '07:00',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_notification_settings_daily_digest_time_length_check
    CHECK (char_length(daily_digest_time) <= 16),
  CONSTRAINT user_notification_settings_weekly_report_day_length_check
    CHECK (char_length(weekly_report_day) <= 16),
  CONSTRAINT user_notification_settings_quiet_hours_start_length_check
    CHECK (char_length(quiet_hours_start) <= 16),
  CONSTRAINT user_notification_settings_quiet_hours_end_length_check
    CHECK (char_length(quiet_hours_end) <= 16)
);

CREATE TABLE IF NOT EXISTS user_accessibility_setting (
  user_id uuid PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
  reduced_motion boolean NOT NULL DEFAULT false,
  contrast_preference text NOT NULL DEFAULT 'Standard',
  focus_indicators boolean NOT NULL DEFAULT true,
  text_density text NOT NULL DEFAULT 'Comfortable',
  screen_reader_labels boolean NOT NULL DEFAULT true,
  keyboard_shortcuts boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_accessibility_settings_contrast_preference_length_check
    CHECK (char_length(contrast_preference) <= 32),
  CONSTRAINT user_accessibility_settings_text_density_length_check
    CHECK (char_length(text_density) <= 32)
);

DO $$
BEGIN
  ALTER TABLE user_accessibility_setting
    DROP CONSTRAINT IF EXISTS user_accessibility_settings_reduced_motion_length_check;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'user_accessibility_setting'
      AND column_name = 'reduced_motion'
      AND data_type <> 'boolean'
  ) THEN
    ALTER TABLE user_accessibility_setting
      ALTER COLUMN reduced_motion DROP DEFAULT,
      ALTER COLUMN reduced_motion TYPE boolean USING (
        CASE
          WHEN lower(reduced_motion::text) IN ('true', 'enabled', 'reduced') THEN true
          ELSE false
        END
      ),
      ALTER COLUMN reduced_motion SET DEFAULT false,
      ALTER COLUMN reduced_motion SET NOT NULL;
  END IF;
END $$;
```

## Rollback

```sql
DROP TABLE IF EXISTS integration_communication_setting;
DROP TABLE IF EXISTS integration_performance_setting;
DROP TABLE IF EXISTS user_accessibility_setting;
DROP TABLE IF EXISTS user_notification_setting;
DROP TABLE IF EXISTS project_region_setting;
DROP TABLE IF EXISTS project_communication_setting;
DROP TABLE IF EXISTS project_performance_setting;
DROP TYPE IF EXISTS communication_header_filter_level;
```
