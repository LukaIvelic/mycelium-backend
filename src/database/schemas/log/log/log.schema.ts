import {
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
  check,
  index,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { projects } from '../../project';
import { apiKeys } from '../../api-key/api-key';

const logSchema = {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  apiKeyId: uuid('api_key_id')
    .notNull()
    .references(() => apiKeys.id, { onDelete: 'cascade' }),
  traceId: text('trace_id').notNull(),
  spanId: text('span_id').notNull(),
  parentSpanId: text('parent_span_id'),
  serviceKey: text('service_key'),
  serviceName: text('service_name'),
  serviceVersion: text('service_version'),
  serviceDescription: text('service_description'),
  serviceOrigin: text('service_origin'),
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
