import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import type { projectPerformanceSettings } from './project-performance-setting.schema';

export type ProjectPerformanceSetting = InferSelectModel<
  typeof projectPerformanceSettings
>;
export type NewProjectPerformanceSetting = InferInsertModel<
  typeof projectPerformanceSettings
>;
