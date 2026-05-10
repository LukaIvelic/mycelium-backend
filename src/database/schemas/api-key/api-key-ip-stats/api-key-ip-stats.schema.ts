import {
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
  primaryKey,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';
import { apiKeys } from '../api-key';

const apiKeyIpStatsSchema = {
  apiKeyId: uuid('api_key_id')
    .notNull()
    .references(() => apiKeys.id),
  ip: text('ip').notNull(),
  firstSeen: timestamp('first_seen', { withTimezone: true }).notNull(),
  lastSeen: timestamp('last_seen', { withTimezone: true }).notNull(),
  requestCount: integer('request_count').notNull(),
  country: text('country').notNull(),
};

const apiKeyIpStatsChecks = (
  table: Record<keyof typeof apiKeyIpStatsSchema, AnyPgColumn>,
) => [primaryKey({ columns: [table.apiKeyId, table.ip] })];

export const apiKeyIpStats = pgTable(
  'api_key_ip_stats',
  apiKeyIpStatsSchema,
  apiKeyIpStatsChecks,
);
