import { sql } from 'drizzle-orm';
import {
  type AnyPgColumn,
  check,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { apiKeys } from '../api-key/api-key';
import { projects } from '../project';

const integrationSchema = {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  apiKeyId: uuid('api_key_id')
    .notNull()
    .references(() => apiKeys.id, { onDelete: 'cascade' }),
  origin: text('origin').notNull(),
  normalizedOrigin: text('normalized_origin').notNull(),
  key: text('key'),
  name: text('name'),
  version: text('version'),
  description: text('description'),
  repository: text('repository'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
};

const integrationChecks = (
  table: Record<keyof typeof integrationSchema, AnyPgColumn>,
) => [
  uniqueIndex('idx_integrations_project_origin').on(
    table.projectId,
    table.normalizedOrigin,
  ),
  check('integrations_key_length_check', sql`char_length(${table.key}) <= 255`),
  check(
    'integrations_name_length_check',
    sql`char_length(${table.name}) <= 255`,
  ),
  check(
    'integrations_version_length_check',
    sql`char_length(${table.version}) <= 255`,
  ),
];

export const integrations = pgTable(
  'integration',
  integrationSchema,
  integrationChecks,
);
