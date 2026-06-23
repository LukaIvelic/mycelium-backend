import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import type {
  communicationHeaderFilterLevelValues,
  projectCommunicationSettings,
} from './project-communication-setting.schema';

export type CommunicationHeaderFilterLevel =
  (typeof communicationHeaderFilterLevelValues)[number];
export type ProjectCommunicationSetting = InferSelectModel<
  typeof projectCommunicationSettings
>;
export type NewProjectCommunicationSetting = InferInsertModel<
  typeof projectCommunicationSettings
>;
