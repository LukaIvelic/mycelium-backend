import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import type { flows } from './flow.schema';

export type Flow = InferSelectModel<typeof flows>;
export type NewFlow = InferInsertModel<typeof flows>;
