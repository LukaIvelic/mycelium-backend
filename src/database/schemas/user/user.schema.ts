import { sql } from 'drizzle-orm';
import {
  type AnyPgColumn,
  check,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

const userSchema = {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  firstName: text('first_name'),
  lastName: text('last_name'),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  validTo: timestamp('valid_to', { withTimezone: true }),
};

const userChecks = (table: Record<keyof typeof userSchema, AnyPgColumn>) => [
  check(
    'users_first_name_length_check',
    sql`char_length(${table.firstName}) <= 64`,
  ),
  check(
    'users_last_name_length_check',
    sql`char_length(${table.lastName}) <= 64`,
  ),
  check('users_email_length_check', sql`char_length(${table.email}) <= 255`),
];

export const users = pgTable('user', userSchema, userChecks);
