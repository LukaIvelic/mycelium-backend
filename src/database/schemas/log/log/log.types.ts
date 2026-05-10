import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import { logs } from './log.schema';

export type Log = InferSelectModel<typeof logs>;
export type NewLog = InferInsertModel<typeof logs>;
