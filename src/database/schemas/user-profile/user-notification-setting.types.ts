import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import type { userNotificationSettings } from './user-notification-setting.schema';

export type UserNotificationSetting = InferSelectModel<
  typeof userNotificationSettings
>;
export type NewUserNotificationSetting = InferInsertModel<
  typeof userNotificationSettings
>;
