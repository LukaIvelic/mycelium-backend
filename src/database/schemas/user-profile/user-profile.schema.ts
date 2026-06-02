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
import { users } from '../user/user.schema';

const userProfileSchema = {
  userId: uuid('user_id')
    .primaryKey()
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  firstName: text('first_name'),
  lastName: text('last_name'),
  username: text('username'),
  randomProfileHex: text('random_profile_hex'),
  email: text('email'),
  bio: text('bio'),
  jobTitle: text('job_title'),
  company: text('company'),
  location: text('location'),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
};

const userProfileChecks = (
  table: Record<keyof typeof userProfileSchema, AnyPgColumn>,
) => [
  uniqueIndex('idx_user_profile_username').on(table.username),
  check(
    'user_profile_first_name_length_check',
    sql`${table.firstName} is null or char_length(${table.firstName}) <= 64`,
  ),
  check(
    'user_profile_last_name_length_check',
    sql`${table.lastName} is null or char_length(${table.lastName}) <= 64`,
  ),
  check(
    'user_profile_username_length_check',
    sql`${table.username} is null or char_length(${table.username}) between 3 and 32`,
  ),
  check(
    'user_profile_random_profile_hex_format_check',
    sql`${table.randomProfileHex} is null or ${table.randomProfileHex} ~* '^#[0-9a-f]{6}$'`,
  ),
  check(
    'user_profile_email_length_check',
    sql`${table.email} is null or char_length(${table.email}) <= 255`,
  ),
  check(
    'user_profile_email_format_check',
    sql`${table.email} is null or ${table.email} ~* '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$'`,
  ),
  check(
    'user_profile_bio_length_check',
    sql`${table.bio} is null or char_length(${table.bio}) <= 1000`,
  ),
  check(
    'user_profile_job_title_length_check',
    sql`${table.jobTitle} is null or char_length(${table.jobTitle}) <= 128`,
  ),
  check(
    'user_profile_company_length_check',
    sql`${table.company} is null or char_length(${table.company}) <= 128`,
  ),
  check(
    'user_profile_location_length_check',
    sql`${table.location} is null or char_length(${table.location}) <= 128`,
  ),
  check(
    'user_profile_avatar_url_length_check',
    sql`${table.avatarUrl} is null or char_length(${table.avatarUrl}) <= 2048`,
  ),
];

export const userProfiles = pgTable(
  'user_profile',
  userProfileSchema,
  userProfileChecks,
);
