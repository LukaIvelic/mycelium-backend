import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import type { userAccessibilitySettings } from './user-accessibility-setting.schema';

export type UserAccessibilitySetting = InferSelectModel<
  typeof userAccessibilitySettings
>;
export type NewUserAccessibilitySetting = InferInsertModel<
  typeof userAccessibilitySettings
>;
