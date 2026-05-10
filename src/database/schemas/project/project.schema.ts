import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from '../user';

const projectSchema = {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id),
  validFrom: timestamp('valid_from', { withTimezone: true })
    .defaultNow()
    .notNull(),
  validTo: timestamp('valid_to', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }),
};

export const projects = pgTable('project', projectSchema);
