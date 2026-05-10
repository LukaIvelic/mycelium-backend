import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import type { logDetails } from './log-detail.schema';

export type LogDetail = InferSelectModel<typeof logDetails>;
export type NewLogDetail = InferInsertModel<typeof logDetails>;
