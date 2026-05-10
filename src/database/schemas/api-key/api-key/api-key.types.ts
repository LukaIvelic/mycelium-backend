import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import { apiKeys } from './api-key.schema';

export type ApiKey = InferSelectModel<typeof apiKeys>;
export type NewApiKey = InferInsertModel<typeof apiKeys>;
export type PublicApiKey = Omit<ApiKey, 'keyHash'>;
