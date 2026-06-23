import { sql } from 'drizzle-orm';
import {
  type AnyPgColumn,
  check,
  boolean as pgBoolean,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { users } from '../user';

const userNotificationSettingSchema = {
  userId: uuid('user_id')
    .primaryKey()
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  productUpdates: pgBoolean('product_updates').default(true).notNull(),
  workspaceActivity: pgBoolean('workspace_activity').default(true).notNull(),
  securityNotices: pgBoolean('security_notices').default(true).notNull(),
  dailyDigestTime: text('daily_digest_time').default('09:00').notNull(),
  weeklyReportDay: text('weekly_report_day').default('Friday').notNull(),
  quietHoursStart: text('quiet_hours_start').default('22:00').notNull(),
  quietHoursEnd: text('quiet_hours_end').default('07:00').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
};

const userNotificationSettingChecks = (
  table: Record<keyof typeof userNotificationSettingSchema, AnyPgColumn>,
) => [
  check(
    'user_notification_settings_daily_digest_time_length_check',
    sql`char_length(${table.dailyDigestTime}) <= 16`,
  ),
  check(
    'user_notification_settings_weekly_report_day_length_check',
    sql`char_length(${table.weeklyReportDay}) <= 16`,
  ),
  check(
    'user_notification_settings_quiet_hours_start_length_check',
    sql`char_length(${table.quietHoursStart}) <= 16`,
  ),
  check(
    'user_notification_settings_quiet_hours_end_length_check',
    sql`char_length(${table.quietHoursEnd}) <= 16`,
  ),
];

export const userNotificationSettings = pgTable(
  'user_notification_setting',
  userNotificationSettingSchema,
  userNotificationSettingChecks,
);
