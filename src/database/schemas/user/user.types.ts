import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import type { users } from './user.schema';

export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;
export type PublicUser = Omit<User, 'passwordHash'>;
