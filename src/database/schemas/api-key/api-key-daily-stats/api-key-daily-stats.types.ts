import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import type { apiKeyDailyStats } from './api-key-daily-stats.schema';

export type ApiKeyDailyStats = InferSelectModel<typeof apiKeyDailyStats>;
export type NewApiKeyDailyStats = InferInsertModel<typeof apiKeyDailyStats>;
