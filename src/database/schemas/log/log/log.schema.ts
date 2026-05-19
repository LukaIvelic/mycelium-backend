import { sql } from 'drizzle-orm';
import {
  type AnyPgColumn,
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { apiKeys } from '../../api-key/api-key';
import { integrations } from '../../integration';
import { projects } from '../../project';

const logSchema = {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  apiKeyId: uuid('api_key_id')
    .notNull()
    .references(() => apiKeys.id, { onDelete: 'cascade' }),
  integrationId: uuid('integration_id').references(() => integrations.id, {
    onDelete: 'set null',
  }),
  callerIntegrationId: uuid('caller_integration_id').references(
    () => integrations.id,
    {
      onDelete: 'set null',
    },
  ),
  traceId: text('trace_id').notNull(),
  spanId: text('span_id').notNull(),
  parentSpanId: text('parent_span_id'),
  integrationKey: text('integration_key'),
  integrationName: text('integration_name'),
  integrationVersion: text('integration_version'),
  integrationDescription: text('integration_description'),
  integrationOrigin: text('integration_origin'),
  method: text('method').notNull(),
  path: text('path').notNull(),
  origin: text('origin').notNull(),
  protocol: text('protocol').notNull(),
  statusCode: integer('status_code').notNull(),
  durationMs: integer('duration_ms').notNull(),
  timestamp: timestamp('timestamp', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
};

const logChecks = (table: Record<keyof typeof logSchema, AnyPgColumn>) => [
  index('idx_logs_project_timestamp').on(table.projectId, table.timestamp),
  index('idx_logs_integration_id').on(table.integrationId),
  index('idx_logs_caller_integration_id').on(table.callerIntegrationId),
  index('idx_logs_trace_id').on(table.traceId),
  check('logs_trace_id_length_check', sql`char_length(${table.traceId}) <= 64`),
  check('logs_span_id_length_check', sql`char_length(${table.spanId}) <= 32`),
  check('logs_method_length_check', sql`char_length(${table.method}) <= 16`),
  check(
    'logs_protocol_length_check',
    sql`char_length(${table.protocol}) <= 16`,
  ),
];

export const logs = pgTable('log', logSchema, logChecks);
