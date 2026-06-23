import type { CommunicationHeaderFilterLevel } from '@/database';

export interface PerformanceSettingsValues {
  captureMetrics: boolean;
  slowRequestThresholdMs: number;
  notifyOnSlowRequests: boolean;
  notifyOnFailedRequests: boolean;
  warningStatusCode: number;
  criticalStatusCode: number;
}

export interface CommunicationSettingsValues {
  subscribeToFetch: boolean;
  subscribeToHttp: boolean;
  captureBody: boolean;
  bodyMaxBytes: number;
  captureStreamBodies: boolean;
  headerFilterLevel: CommunicationHeaderFilterLevel;
}

export interface ProjectRegionSettingsValues {
  primaryRegion: string;
  dataResidency: string;
  failoverRegion: string;
  timezone: string;
  dateFormat: string;
}

export interface UserNotificationSettingsValues {
  productUpdates: boolean;
  workspaceActivity: boolean;
  securityNotices: boolean;
  dailyDigestTime: string;
  weeklyReportDay: string;
  quietHoursStart: string;
  quietHoursEnd: string;
}

export interface UserAccessibilitySettingsValues {
  reducedMotion: boolean;
  contrastPreference: string;
  focusIndicators: boolean;
  textDensity: string;
  screenReaderLabels: boolean;
  keyboardShortcuts: boolean;
}
