import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import type { projectRegionSettings } from './project-region-setting.schema';

export type ProjectRegionSetting = InferSelectModel<
  typeof projectRegionSettings
>;
export type NewProjectRegionSetting = InferInsertModel<
  typeof projectRegionSettings
>;
