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
import { communicationHeaderFilterLevels } from '../project';
import { integrations } from './integration.schema';

const integrationCommunicationSettingSchema = {
  integrationId: uuid('integration_id')
    .primaryKey()
    .notNull()
    .references(() => integrations.id, { onDelete: 'cascade' }),
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

const integrationCommunicationSettingChecks = (
  table: Record<
    keyof typeof integrationCommunicationSettingSchema,
    AnyPgColumn
  >,
) => [
  check(
    'integration_communication_settings_body_max_bytes_check',
    sql`${table.bodyMaxBytes} >= 0`,
  ),
];

export const integrationCommunicationSettings = pgTable(
  'integration_communication_setting',
  integrationCommunicationSettingSchema,
  integrationCommunicationSettingChecks,
);
