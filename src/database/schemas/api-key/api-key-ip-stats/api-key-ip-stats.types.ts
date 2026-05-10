import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import type { apiKeyIpStats } from './api-key-ip-stats.schema';

export type ApiKeyIpStats = InferSelectModel<typeof apiKeyIpStats>;
export type NewApiKeyIpStats = InferInsertModel<typeof apiKeyIpStats>;
