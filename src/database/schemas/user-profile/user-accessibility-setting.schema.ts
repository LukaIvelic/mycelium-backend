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

const userAccessibilitySettingSchema = {
  userId: uuid('user_id')
    .primaryKey()
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  reducedMotion: pgBoolean('reduced_motion').default(false).notNull(),
  contrastPreference: text('contrast_preference').default('Standard').notNull(),
  focusIndicators: pgBoolean('focus_indicators').default(true).notNull(),
  textDensity: text('text_density').default('Comfortable').notNull(),
  screenReaderLabels: pgBoolean('screen_reader_labels').default(true).notNull(),
  keyboardShortcuts: pgBoolean('keyboard_shortcuts').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
};

const userAccessibilitySettingChecks = (
  table: Record<keyof typeof userAccessibilitySettingSchema, AnyPgColumn>,
) => [
  check(
    'user_accessibility_settings_contrast_preference_length_check',
    sql`char_length(${table.contrastPreference}) <= 32`,
  ),
  check(
    'user_accessibility_settings_text_density_length_check',
    sql`char_length(${table.textDensity}) <= 32`,
  ),
];

export const userAccessibilitySettings = pgTable(
  'user_accessibility_setting',
  userAccessibilitySettingSchema,
  userAccessibilitySettingChecks,
);
