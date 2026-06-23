import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import type { integrationPerformanceSettings } from './integration-performance-setting.schema';

export type IntegrationPerformanceSetting = InferSelectModel<
  typeof integrationPerformanceSettings
>;
export type NewIntegrationPerformanceSetting = InferInsertModel<
  typeof integrationPerformanceSettings
>;
