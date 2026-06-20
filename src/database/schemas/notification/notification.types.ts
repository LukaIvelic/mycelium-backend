import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import type {
  notificationSeverityValues,
  notifications,
  notificationTypeValues,
} from './notification.schema';

export type Notification = InferSelectModel<typeof notifications>;
export type NewNotification = InferInsertModel<typeof notifications>;
export type NotificationSeverity = (typeof notificationSeverityValues)[number];
export type NotificationType = (typeof notificationTypeValues)[number];
