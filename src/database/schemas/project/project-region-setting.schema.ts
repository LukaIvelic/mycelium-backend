import { sql } from 'drizzle-orm';
import {
  type AnyPgColumn,
  check,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { projects } from './project.schema';

const projectRegionSettingSchema = {
  projectId: uuid('project_id')
    .primaryKey()
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  primaryRegion: text('primary_region').default('EU Central').notNull(),
  dataResidency: text('data_residency').default('European Union').notNull(),
  failoverRegion: text('failover_region').default('EU West').notNull(),
  timezone: text('timezone').default('Europe/Zagreb').notNull(),
  dateFormat: text('date_format').default('DD/MM/YYYY').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
};

const projectRegionSettingChecks = (
  table: Record<keyof typeof projectRegionSettingSchema, AnyPgColumn>,
) => [
  check(
    'project_region_settings_primary_region_length_check',
    sql`char_length(${table.primaryRegion}) <= 64`,
  ),
  check(
    'project_region_settings_data_residency_length_check',
    sql`char_length(${table.dataResidency}) <= 64`,
  ),
  check(
    'project_region_settings_failover_region_length_check',
    sql`char_length(${table.failoverRegion}) <= 64`,
  ),
  check(
    'project_region_settings_timezone_length_check',
    sql`char_length(${table.timezone}) <= 64`,
  ),
  check(
    'project_region_settings_date_format_length_check',
    sql`char_length(${table.dateFormat}) <= 32`,
  ),
];

export const projectRegionSettings = pgTable(
  'project_region_setting',
  projectRegionSettingSchema,
  projectRegionSettingChecks,
);
