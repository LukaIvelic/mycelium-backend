import { sql } from 'drizzle-orm';
import {
  type AnyPgColumn,
  bigint,
  check,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { projects } from '../../project';

const apiKeySchema = {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  name: text('name').notNull().default(''),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id),
  keyPrefix: text('key_prefix').notNull(),
  keyHash: text('key_hash').notNull().unique(),
  validFrom: timestamp('valid_from', { withTimezone: true })
    .defaultNow()
    .notNull(),
  validTo: timestamp('valid_to', { withTimezone: true }),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  lastUsedIp: text('last_used_ip'),
  usageCount: bigint('usage_count', { mode: 'number' }).default(0).notNull(),
  rateLimitPerMinute: integer('rate_limit_per_minute').default(0).notNull(),
  metadata: jsonb('metadata'),
};

const apiKeyChecks = (
  table: Record<keyof typeof apiKeySchema, AnyPgColumn>,
) => [
  check('api_keys_name_length_check', sql`char_length(${table.name}) <= 255`),
  check(
    'api_keys_key_prefix_length_check',
    sql`char_length(${table.keyPrefix}) <= 8`,
  ),
  check(
    'api_keys_key_hash_length_check',
    sql`char_length(${table.keyHash}) <= 64`,
  ),
];

export const apiKeys = pgTable('api_key', apiKeySchema, apiKeyChecks);
