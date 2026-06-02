import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import type { userProfiles } from './user-profile.schema';

export type UserProfile = InferSelectModel<typeof userProfiles>;
export type NewUserProfile = InferInsertModel<typeof userProfiles>;
