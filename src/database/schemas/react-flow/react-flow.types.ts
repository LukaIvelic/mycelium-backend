import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import { reactFlows } from './react-flow.schema';

export type ReactFlow = InferSelectModel<typeof reactFlows>;
export type NewReactFlow = InferInsertModel<typeof reactFlows>;
