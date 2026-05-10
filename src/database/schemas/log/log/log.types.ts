import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import type { logs } from './log.schema';

export type Log = InferSelectModel<typeof logs>;
export type NewLog = InferInsertModel<typeof logs>;
