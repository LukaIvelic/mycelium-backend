import {
  pgTable,
  uuid,
  integer,
  primaryKey,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';
import { apiKeys } from '../api-key';

const apiKeyDailyStatsSchema = {
  id: uuid('id').notNull(),
  apiKeyId: uuid('api_key_id')
    .notNull()
    .references(() => apiKeys.id),
  totalRequests: integer('total_requests').notNull(),
  successfulRequests: integer('successful_requests').notNull(),
  errorRequests: integer('error_requests').notNull(),
  averageLatencyMs: integer('average_latency_ms').notNull(),
  p95LatencyMs: integer('p95_latency_ms').notNull(),
  totalBytesIn: integer('total_bytes_in').notNull(),
  totalBytesOut: integer('total_bytes_out').notNull(),
  uniqueIps: integer('unique_ips').notNull(),
};

const apiKeyDailyStatsChecks = (
  table: Record<keyof typeof apiKeyDailyStatsSchema, AnyPgColumn>,
) => [primaryKey({ columns: [table.id, table.apiKeyId] })];

export const apiKeyDailyStats = pgTable(
  'api_key_daily_stats',
  apiKeyDailyStatsSchema,
  apiKeyDailyStatsChecks,
);
