import { sql } from 'drizzle-orm';
import {
  type AnyPgColumn,
  check,
  integer,
  boolean as pgBoolean,
  pgEnum,
  pgTable,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { projects } from './project.schema';

export const communicationHeaderFilterLevelValues = [
  'HIGH',
  'MEDIUM',
  'METADATA',
  'ALL',
] as const;
export const communicationHeaderFilterLevels = pgEnum(
  'communication_header_filter_level',
  communicationHeaderFilterLevelValues,
);

const projectCommunicationSettingSchema = {
  projectId: uuid('project_id')
    .primaryKey()
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  subscribeToFetch: pgBoolean('subscribe_to_fetch').default(false).notNull(),
  subscribeToHttp: pgBoolean('subscribe_to_http').default(false).notNull(),
  captureBody: pgBoolean('capture_body').default(false).notNull(),
  bodyMaxBytes: integer('body_max_bytes').default(0).notNull(),
  captureStreamBodies: pgBoolean('capture_stream_bodies')
    .default(false)
    .notNull(),
  headerFilterLevel: communicationHeaderFilterLevels('header_filter_level')
    .default('HIGH')
    .notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
};

const projectCommunicationSettingChecks = (
  table: Record<keyof typeof projectCommunicationSettingSchema, AnyPgColumn>,
) => [
  check(
    'project_communication_settings_body_max_bytes_check',
    sql`${table.bodyMaxBytes} >= 0`,
  ),
];

export const projectCommunicationSettings = pgTable(
  'project_communication_setting',
  projectCommunicationSettingSchema,
  projectCommunicationSettingChecks,
);
