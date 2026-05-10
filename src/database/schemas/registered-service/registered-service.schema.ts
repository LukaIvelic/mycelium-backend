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

const registeredServiceSchema = {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  apiKeyId: uuid('api_key_id')
    .notNull()
    .references(() => apiKeys.id, { onDelete: 'cascade' }),
  serviceOrigin: text('service_origin').notNull(),
  normalizedOrigin: text('normalized_origin').notNull(),
  serviceKey: text('service_key'),
  serviceName: text('service_name'),
  serviceVersion: text('service_version'),
  serviceDescription: text('service_description'),
  serviceRepository: text('service_repository'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
};

const registeredServiceChecks = (
  table: Record<keyof typeof registeredServiceSchema, AnyPgColumn>,
) => [
  uniqueIndex('idx_registered_services_project_origin').on(
    table.projectId,
    table.normalizedOrigin,
  ),
  check(
    'registered_services_service_key_length_check',
    sql`char_length(${table.serviceKey}) <= 255`,
  ),
  check(
    'registered_services_service_name_length_check',
    sql`char_length(${table.serviceName}) <= 255`,
  ),
  check(
    'registered_services_service_version_length_check',
    sql`char_length(${table.serviceVersion}) <= 255`,
  ),
];

export const registeredServices = pgTable(
  'registered_service',
  registeredServiceSchema,
  registeredServiceChecks,
);
