import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import type { registeredServices } from './registered-service.schema';

export type RegisteredService = InferSelectModel<typeof registeredServices>;
export type NewRegisteredService = InferInsertModel<typeof registeredServices>;
