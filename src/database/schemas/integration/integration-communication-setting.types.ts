import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import type { integrationCommunicationSettings } from './integration-communication-setting.schema';

export type IntegrationCommunicationSetting = InferSelectModel<
  typeof integrationCommunicationSettings
>;
export type NewIntegrationCommunicationSetting = InferInsertModel<
  typeof integrationCommunicationSettings
>;
