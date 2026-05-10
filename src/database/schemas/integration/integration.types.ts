import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import type { integrations } from './integration.schema';

export type Integration = InferSelectModel<typeof integrations>;
export type NewIntegration = InferInsertModel<typeof integrations>;
