import { sql } from 'drizzle-orm';
import {
  type AnyPgColumn,
  boolean,
  check,
  doublePrecision,
  integer,
  jsonb,
  pgTable,
  text,
  uuid,
} from 'drizzle-orm/pg-core';
import { logs } from '../log';

const logDetailSchema = {
  logId: uuid('log_id')
    .primaryKey()
    .notNull()
    .references(() => logs.id, { onDelete: 'cascade' }),
  bodySizeKb: doublePrecision('body_size_kb').default(0).notNull(),
  contentLength: integer('content_length').default(0).notNull(),
  contentType: text('content_type').default('').notNull(),
  body: text('body'),
  headers: jsonb('headers').default({}).notNull(),
  completed: boolean('completed').default(false).notNull(),
  aborted: boolean('aborted').default(false).notNull(),
  idempotent: boolean('idempotent').default(false).notNull(),
};

const logDetailChecks = (
  table: Record<keyof typeof logDetailSchema, AnyPgColumn>,
) => [
  check(
    'log_details_content_type_length_check',
    sql`char_length(${table.contentType}) <= 255`,
  ),
];

export const logDetails = pgTable(
  'log_detail',
  logDetailSchema,
  logDetailChecks,
);
