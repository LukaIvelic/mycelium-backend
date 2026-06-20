import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { projects } from '../project';
import { users } from '../user';

export const notificationSeverityValues = [
  'critical',
  'info',
  'warning',
] as const;
export const notificationTypeValues = [
  'project_member_added',
  'project_member_removed',
  'project_member_role_updated',
  'project_deleted',
  'request_warning',
  'server_error',
  'slow_request',
] as const;

export const notificationSeverities = pgEnum(
  'notification_severity',
  notificationSeverityValues,
);
export const notificationTypes = pgEnum(
  'notification_type',
  notificationTypeValues,
);

const notificationSchema = {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  projectId: uuid('project_id').references(() => projects.id, {
    onDelete: 'set null',
  }),
  type: notificationTypes('type').notNull(),
  severity: notificationSeverities('severity').notNull(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  readAt: timestamp('read_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
};

export const notifications = pgTable(
  'notification',
  notificationSchema,
  (table) => [
    index('idx_notifications_user_created').on(table.userId, table.createdAt),
    index('idx_notifications_user_project').on(table.userId, table.projectId),
  ],
);
