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

const reactFlowSchema = {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  signature: text('signature').notNull(),
  nodes: jsonb('nodes').notNull(),
  edges: jsonb('edges').notNull(),
};

const reactFlowChecks = (
  table: Record<keyof typeof reactFlowSchema, AnyPgColumn>,
) => [
  uniqueIndex('idx_react_flows_project_id').on(table.projectId),
  check(
    'react_flows_signature_length_check',
    sql`char_length(${table.signature}) <= 64`,
  ),
];

export const reactFlows = pgTable(
  'react_flow',
  reactFlowSchema,
  reactFlowChecks,
);
