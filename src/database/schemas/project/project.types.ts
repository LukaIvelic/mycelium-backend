import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import type { projects } from './project.schema';

export type Project = InferSelectModel<typeof projects>;
export type NewProject = InferInsertModel<typeof projects>;
