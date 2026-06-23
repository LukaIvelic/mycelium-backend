import { sql } from 'drizzle-orm';
import {
  type AnyPgColumn,
  check,
  integer,
  boolean as pgBoolean,
  pgTable,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { projects } from './project.schema';

const projectPerformanceSettingSchema = {
  projectId: uuid('project_id')
    .primaryKey()
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  captureMetrics: pgBoolean('capture_metrics').default(false).notNull(),
  slowRequestThresholdMs: integer('slow_request_threshold_ms')
    .default(1000)
    .notNull(),
  notifyOnSlowRequests: pgBoolean('notify_on_slow_requests')
    .default(true)
    .notNull(),
  notifyOnFailedRequests: pgBoolean('notify_on_failed_requests')
    .default(true)
    .notNull(),
  warningStatusCode: integer('warning_status_code').default(400).notNull(),
  criticalStatusCode: integer('critical_status_code').default(500).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
};

const projectPerformanceSettingChecks = (
  table: Record<keyof typeof projectPerformanceSettingSchema, AnyPgColumn>,
) => [
  check(
    'project_performance_settings_slow_request_threshold_check',
    sql`${table.slowRequestThresholdMs} >= 0`,
  ),
  check(
    'project_performance_settings_warning_status_code_check',
    sql`${table.warningStatusCode} between 100 and 599`,
  ),
  check(
    'project_performance_settings_critical_status_code_check',
    sql`${table.criticalStatusCode} between 100 and 599`,
  ),
  check(
    'project_performance_settings_status_code_order_check',
    sql`${table.warningStatusCode} <= ${table.criticalStatusCode}`,
  ),
];

export const projectPerformanceSettings = pgTable(
  'project_performance_setting',
  projectPerformanceSettingSchema,
  projectPerformanceSettingChecks,
);
