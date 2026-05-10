import { sql } from 'drizzle-orm';
import {
  type AnyPgColumn,
  check,
  jsonb,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { projects } from '../project';

const flowSchema = {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  signature: text('signature').notNull(),
  nodes: jsonb('nodes').notNull(),
  edges: jsonb('edges').notNull(),
};

const flowChecks = (table: Record<keyof typeof flowSchema, AnyPgColumn>) => [
  uniqueIndex('idx_flows_project_id').on(table.projectId),
  check(
    'flows_signature_length_check',
    sql`char_length(${table.signature}) <= 64`,
  ),
];

export const flows = pgTable('flow', flowSchema, flowChecks);
