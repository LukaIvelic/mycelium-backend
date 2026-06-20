import {
  index,
  pgEnum,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { users } from '../user';
import { projects } from './project.schema';

export const projectMemberRoleValues = [
  'owner',
  'admin',
  'member',
  'viewer',
] as const;
export const assignableProjectMemberRoleValues = [
  'admin',
  'member',
  'viewer',
] as const;
export const projectMemberRoles = pgEnum(
  'project_member_role',
  projectMemberRoleValues,
);

const projectMemberSchema = {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  role: projectMemberRoles('role').notNull(),
  addedByUserId: uuid('added_by_user_id').references(() => users.id, {
    onDelete: 'set null',
  }),
  validFrom: timestamp('valid_from', { withTimezone: true })
    .defaultNow()
    .notNull(),
  validTo: timestamp('valid_to', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
};

export const projectMembers = pgTable(
  'project_member',
  projectMemberSchema,
  (table) => [
    uniqueIndex('idx_project_members_project_user').on(
      table.projectId,
      table.userId,
    ),
    index('idx_project_members_user').on(table.userId),
  ],
);
