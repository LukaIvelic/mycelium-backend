import { BadRequestException, Injectable } from '@nestjs/common';
import type {
  IntegrationCommunicationSetting,
  IntegrationPerformanceSetting,
  ProjectCommunicationSetting,
  ProjectPerformanceSetting,
  ProjectRegionSetting,
  UserAccessibilitySetting,
  UserNotificationSetting,
} from '@/database';
import type { Database } from '@/database/database.types';
import { Errors } from '@/lib/constants/errors';
import type {
  CommunicationSettingsDto,
  CommunicationSettingsResponse,
  PerformanceSettingsDto,
  PerformanceSettingsResponse,
  ProjectRegionSettingsDto,
  ProjectRegionSettingsResponse,
  RuntimeSettingsResponse,
  UserAccessibilitySettingsDto,
  UserAccessibilitySettingsResponse,
  UserNotificationSettingsDto,
  UserNotificationSettingsResponse,
} from './settings.dto';
import { SettingsRepository } from './settings.repository';
import type {
  CommunicationSettingsValues,
  PerformanceSettingsValues,
  ProjectRegionSettingsValues,
  UserAccessibilitySettingsValues,
  UserNotificationSettingsValues,
} from './settings.types';

const DEFAULT_PERFORMANCE_SETTINGS: PerformanceSettingsValues = {
  captureMetrics: false,
  slowRequestThresholdMs: 1000,
  notifyOnSlowRequests: true,
  notifyOnFailedRequests: true,
  warningStatusCode: 400,
  criticalStatusCode: 500,
};

const DEFAULT_COMMUNICATION_SETTINGS: CommunicationSettingsValues = {
  subscribeToFetch: false,
  subscribeToHttp: false,
  captureBody: false,
  bodyMaxBytes: 0,
  captureStreamBodies: false,
  headerFilterLevel: 'HIGH',
};

const DEFAULT_PROJECT_REGION_SETTINGS: ProjectRegionSettingsValues = {
  primaryRegion: 'EU Central',
  dataResidency: 'European Union',
  failoverRegion: 'EU West',
  timezone: 'Europe/Zagreb',
  dateFormat: 'DD/MM/YYYY',
};

const DEFAULT_USER_NOTIFICATION_SETTINGS: UserNotificationSettingsValues = {
  productUpdates: true,
  workspaceActivity: true,
  securityNotices: true,
  dailyDigestTime: '09:00',
  weeklyReportDay: 'Friday',
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00',
};

const DEFAULT_USER_ACCESSIBILITY_SETTINGS: UserAccessibilitySettingsValues = {
  reducedMotion: false,
  contrastPreference: 'Standard',
  focusIndicators: true,
  textDensity: 'Comfortable',
  screenReaderLabels: true,
  keyboardShortcuts: true,
};

@Injectable()
export class SettingsService {
  constructor(private readonly settingsRepository: SettingsRepository) {}

  async findProjectPerformance(
    projectId: string,
  ): Promise<PerformanceSettingsResponse> {
    const row = await this.settingsRepository.findProjectPerformance(projectId);
    return this.toProjectPerformanceResponse(projectId, row);
  }

  async replaceProjectPerformance(
    projectId: string,
    dto: PerformanceSettingsDto,
  ): Promise<PerformanceSettingsResponse> {
    const next = this.normalizePerformance(DEFAULT_PERFORMANCE_SETTINGS, dto);
    const row = await this.settingsRepository.upsertProjectPerformance(
      projectId,
      next,
    );
    return this.toProjectPerformanceResponse(projectId, row);
  }

  async updateProjectPerformance(
    projectId: string,
    dto: PerformanceSettingsDto,
  ): Promise<PerformanceSettingsResponse> {
    const current =
      await this.settingsRepository.findProjectPerformance(projectId);
    const next = this.normalizePerformance(
      current ?? DEFAULT_PERFORMANCE_SETTINGS,
      dto,
    );
    const row = await this.settingsRepository.upsertProjectPerformance(
      projectId,
      next,
    );
    return this.toProjectPerformanceResponse(projectId, row);
  }

  deleteProjectPerformance(projectId: string): Promise<void> {
    return this.settingsRepository.deleteProjectPerformance(projectId);
  }

  async findProjectCommunication(
    projectId: string,
  ): Promise<CommunicationSettingsResponse> {
    const row =
      await this.settingsRepository.findProjectCommunication(projectId);
    return this.toProjectCommunicationResponse(projectId, row);
  }

  async replaceProjectCommunication(
    projectId: string,
    dto: CommunicationSettingsDto,
  ): Promise<CommunicationSettingsResponse> {
    const next = this.normalizeCommunication(
      DEFAULT_COMMUNICATION_SETTINGS,
      dto,
    );
    const row = await this.settingsRepository.upsertProjectCommunication(
      projectId,
      next,
    );
    return this.toProjectCommunicationResponse(projectId, row);
  }

  async updateProjectCommunication(
    projectId: string,
    dto: CommunicationSettingsDto,
  ): Promise<CommunicationSettingsResponse> {
    const current =
      await this.settingsRepository.findProjectCommunication(projectId);
    const next = this.normalizeCommunication(
      current ?? DEFAULT_COMMUNICATION_SETTINGS,
      dto,
    );
    const row = await this.settingsRepository.upsertProjectCommunication(
      projectId,
      next,
    );
    return this.toProjectCommunicationResponse(projectId, row);
  }

  deleteProjectCommunication(projectId: string): Promise<void> {
    return this.settingsRepository.deleteProjectCommunication(projectId);
  }

  async findProjectRegion(
    projectId: string,
  ): Promise<ProjectRegionSettingsResponse> {
    const row = await this.settingsRepository.findProjectRegion(projectId);
    return this.toProjectRegionResponse(projectId, row);
  }

  async updateProjectRegion(
    projectId: string,
    dto: ProjectRegionSettingsDto,
  ): Promise<ProjectRegionSettingsResponse> {
    const current = await this.settingsRepository.findProjectRegion(projectId);
    const next = this.normalizeProjectRegion(
      current ?? DEFAULT_PROJECT_REGION_SETTINGS,
      dto,
    );
    const row = await this.settingsRepository.upsertProjectRegion(
      projectId,
      next,
    );
    return this.toProjectRegionResponse(projectId, row);
  }

  deleteProjectRegion(projectId: string): Promise<void> {
    return this.settingsRepository.deleteProjectRegion(projectId);
  }

  async findIntegrationPerformance(
    integrationId: string,
  ): Promise<PerformanceSettingsResponse> {
    const row =
      await this.settingsRepository.findIntegrationPerformance(integrationId);
    return this.toIntegrationPerformanceResponse(integrationId, row);
  }

  async replaceIntegrationPerformance(
    integrationId: string,
    dto: PerformanceSettingsDto,
  ): Promise<PerformanceSettingsResponse> {
    const next = this.normalizePerformance(DEFAULT_PERFORMANCE_SETTINGS, dto);
    const row = await this.settingsRepository.upsertIntegrationPerformance(
      integrationId,
      next,
    );
    return this.toIntegrationPerformanceResponse(integrationId, row);
  }

  async updateIntegrationPerformance(
    integrationId: string,
    dto: PerformanceSettingsDto,
  ): Promise<PerformanceSettingsResponse> {
    const current =
      await this.settingsRepository.findIntegrationPerformance(integrationId);
    const next = this.normalizePerformance(
      current ?? DEFAULT_PERFORMANCE_SETTINGS,
      dto,
    );
    const row = await this.settingsRepository.upsertIntegrationPerformance(
      integrationId,
      next,
    );
    return this.toIntegrationPerformanceResponse(integrationId, row);
  }

  deleteIntegrationPerformance(integrationId: string): Promise<void> {
    return this.settingsRepository.deleteIntegrationPerformance(integrationId);
  }

  async findIntegrationCommunication(
    integrationId: string,
  ): Promise<CommunicationSettingsResponse> {
    const row =
      await this.settingsRepository.findIntegrationCommunication(integrationId);
    return this.toIntegrationCommunicationResponse(integrationId, row);
  }

  async replaceIntegrationCommunication(
    integrationId: string,
    dto: CommunicationSettingsDto,
  ): Promise<CommunicationSettingsResponse> {
    const next = this.normalizeCommunication(
      DEFAULT_COMMUNICATION_SETTINGS,
      dto,
    );
    const row = await this.settingsRepository.upsertIntegrationCommunication(
      integrationId,
      next,
    );
    return this.toIntegrationCommunicationResponse(integrationId, row);
  }

  async updateIntegrationCommunication(
    integrationId: string,
    dto: CommunicationSettingsDto,
  ): Promise<CommunicationSettingsResponse> {
    const current =
      await this.settingsRepository.findIntegrationCommunication(integrationId);
    const next = this.normalizeCommunication(
      current ?? DEFAULT_COMMUNICATION_SETTINGS,
      dto,
    );
    const row = await this.settingsRepository.upsertIntegrationCommunication(
      integrationId,
      next,
    );
    return this.toIntegrationCommunicationResponse(integrationId, row);
  }

  deleteIntegrationCommunication(integrationId: string): Promise<void> {
    return this.settingsRepository.deleteIntegrationCommunication(
      integrationId,
    );
  }

  async findUserNotification(
    userId: string,
  ): Promise<UserNotificationSettingsResponse> {
    const row = await this.settingsRepository.findUserNotification(userId);
    return this.toUserNotificationResponse(userId, row);
  }

  async updateUserNotification(
    userId: string,
    dto: UserNotificationSettingsDto,
  ): Promise<UserNotificationSettingsResponse> {
    const current = await this.settingsRepository.findUserNotification(userId);
    const next = this.normalizeUserNotification(
      current ?? DEFAULT_USER_NOTIFICATION_SETTINGS,
      dto,
    );
    const row = await this.settingsRepository.upsertUserNotification(
      userId,
      next,
    );
    return this.toUserNotificationResponse(userId, row);
  }

  deleteUserNotification(userId: string): Promise<void> {
    return this.settingsRepository.deleteUserNotification(userId);
  }

  async findUserAccessibility(
    userId: string,
  ): Promise<UserAccessibilitySettingsResponse> {
    const row = await this.settingsRepository.findUserAccessibility(userId);
    return this.toUserAccessibilityResponse(userId, row);
  }

  async updateUserAccessibility(
    userId: string,
    dto: UserAccessibilitySettingsDto,
  ): Promise<UserAccessibilitySettingsResponse> {
    const current = await this.settingsRepository.findUserAccessibility(userId);
    const next = this.normalizeUserAccessibility(
      current ?? DEFAULT_USER_ACCESSIBILITY_SETTINGS,
      dto,
    );
    const row = await this.settingsRepository.upsertUserAccessibility(
      userId,
      next,
    );
    return this.toUserAccessibilityResponse(userId, row);
  }

  deleteUserAccessibility(userId: string): Promise<void> {
    return this.settingsRepository.deleteUserAccessibility(userId);
  }

  async resolveRuntimeSettings(
    projectId: string,
    integrationId?: string | null,
    tx?: Database,
  ): Promise<RuntimeSettingsResponse> {
    const performance = await this.resolvePerformance(
      projectId,
      integrationId,
      tx,
    );
    const communication = await this.resolveCommunication(
      projectId,
      integrationId,
      tx,
    );

    return { performance, communication };
  }

  async resolvePerformance(
    projectId: string,
    integrationId?: string | null,
    tx?: Database,
  ): Promise<PerformanceSettingsValues> {
    const projectSettings =
      await this.settingsRepository.findProjectPerformance(projectId, tx);
    const integrationSettings = integrationId
      ? await this.settingsRepository.findIntegrationPerformance(
          integrationId,
          tx,
        )
      : null;

    return {
      ...DEFAULT_PERFORMANCE_SETTINGS,
      ...this.performanceValues(projectSettings),
      ...this.performanceValues(integrationSettings),
    };
  }

  async resolveCommunication(
    projectId: string,
    integrationId?: string | null,
    tx?: Database,
  ): Promise<CommunicationSettingsValues> {
    const projectSettings =
      await this.settingsRepository.findProjectCommunication(projectId, tx);
    const integrationSettings = integrationId
      ? await this.settingsRepository.findIntegrationCommunication(
          integrationId,
          tx,
        )
      : null;

    return {
      ...DEFAULT_COMMUNICATION_SETTINGS,
      ...this.communicationValues(projectSettings),
      ...this.communicationValues(integrationSettings),
    };
  }

  private normalizePerformance(
    current: PerformanceSettingsValues,
    dto: PerformanceSettingsDto,
  ): PerformanceSettingsValues {
    const next: PerformanceSettingsValues = {
      ...current,
      ...this.definedValues(dto),
    };

    if (next.warningStatusCode > next.criticalStatusCode) {
      throw new BadRequestException(Errors.Settings.InvalidStatusCodeOrder);
    }

    return next;
  }

  private normalizeCommunication(
    current: CommunicationSettingsValues,
    dto: CommunicationSettingsDto,
  ): CommunicationSettingsValues {
    return {
      ...current,
      ...this.definedValues(dto),
    };
  }

  private normalizeProjectRegion(
    current: ProjectRegionSettingsValues,
    dto: ProjectRegionSettingsDto,
  ): ProjectRegionSettingsValues {
    return {
      ...current,
      ...this.definedValues(dto),
    };
  }

  private normalizeUserNotification(
    current: UserNotificationSettingsValues,
    dto: UserNotificationSettingsDto,
  ): UserNotificationSettingsValues {
    return {
      ...current,
      ...this.definedValues(dto),
    };
  }

  private normalizeUserAccessibility(
    current: UserAccessibilitySettingsValues,
    dto: UserAccessibilitySettingsDto,
  ): UserAccessibilitySettingsValues {
    return {
      ...current,
      ...this.definedValues(dto),
    };
  }

  private toProjectPerformanceResponse(
    projectId: string,
    row: ProjectPerformanceSetting | null,
  ): PerformanceSettingsResponse {
    return {
      projectId,
      ...DEFAULT_PERFORMANCE_SETTINGS,
      ...this.performanceValues(row),
      createdAt: row?.createdAt ?? null,
      updatedAt: row?.updatedAt ?? null,
    };
  }

  private toIntegrationPerformanceResponse(
    integrationId: string,
    row: IntegrationPerformanceSetting | null,
  ): PerformanceSettingsResponse {
    return {
      integrationId,
      ...DEFAULT_PERFORMANCE_SETTINGS,
      ...this.performanceValues(row),
      createdAt: row?.createdAt ?? null,
      updatedAt: row?.updatedAt ?? null,
    };
  }

  private toProjectCommunicationResponse(
    projectId: string,
    row: ProjectCommunicationSetting | null,
  ): CommunicationSettingsResponse {
    return {
      projectId,
      ...DEFAULT_COMMUNICATION_SETTINGS,
      ...this.communicationValues(row),
      createdAt: row?.createdAt ?? null,
      updatedAt: row?.updatedAt ?? null,
    };
  }

  private toProjectRegionResponse(
    projectId: string,
    row: ProjectRegionSetting | null,
  ): ProjectRegionSettingsResponse {
    return {
      projectId,
      ...DEFAULT_PROJECT_REGION_SETTINGS,
      ...this.projectRegionValues(row),
      createdAt: row?.createdAt ?? null,
      updatedAt: row?.updatedAt ?? null,
    };
  }

  private toIntegrationCommunicationResponse(
    integrationId: string,
    row: IntegrationCommunicationSetting | null,
  ): CommunicationSettingsResponse {
    return {
      integrationId,
      ...DEFAULT_COMMUNICATION_SETTINGS,
      ...this.communicationValues(row),
      createdAt: row?.createdAt ?? null,
      updatedAt: row?.updatedAt ?? null,
    };
  }

  private toUserNotificationResponse(
    userId: string,
    row: UserNotificationSetting | null,
  ): UserNotificationSettingsResponse {
    return {
      userId,
      ...DEFAULT_USER_NOTIFICATION_SETTINGS,
      ...this.userNotificationValues(row),
      createdAt: row?.createdAt ?? null,
      updatedAt: row?.updatedAt ?? null,
    };
  }

  private toUserAccessibilityResponse(
    userId: string,
    row: UserAccessibilitySetting | null,
  ): UserAccessibilitySettingsResponse {
    return {
      userId,
      ...DEFAULT_USER_ACCESSIBILITY_SETTINGS,
      ...this.userAccessibilityValues(row),
      createdAt: row?.createdAt ?? null,
      updatedAt: row?.updatedAt ?? null,
    };
  }

  private performanceValues(
    row: PerformanceSettingsValues | null,
  ): Partial<PerformanceSettingsValues> {
    if (!row) return {};

    return {
      captureMetrics: row.captureMetrics,
      slowRequestThresholdMs: row.slowRequestThresholdMs,
      notifyOnSlowRequests: row.notifyOnSlowRequests,
      notifyOnFailedRequests: row.notifyOnFailedRequests,
      warningStatusCode: row.warningStatusCode,
      criticalStatusCode: row.criticalStatusCode,
    };
  }

  private communicationValues(
    row: CommunicationSettingsValues | null,
  ): Partial<CommunicationSettingsValues> {
    if (!row) return {};

    return {
      subscribeToFetch: row.subscribeToFetch,
      subscribeToHttp: row.subscribeToHttp,
      captureBody: row.captureBody,
      bodyMaxBytes: row.bodyMaxBytes,
      captureStreamBodies: row.captureStreamBodies,
      headerFilterLevel: row.headerFilterLevel,
    };
  }

  private projectRegionValues(
    row: ProjectRegionSettingsValues | null,
  ): Partial<ProjectRegionSettingsValues> {
    if (!row) return {};

    return {
      primaryRegion: row.primaryRegion,
      dataResidency: row.dataResidency,
      failoverRegion: row.failoverRegion,
      timezone: row.timezone,
      dateFormat: row.dateFormat,
    };
  }

  private userNotificationValues(
    row: UserNotificationSettingsValues | null,
  ): Partial<UserNotificationSettingsValues> {
    if (!row) return {};

    return {
      productUpdates: row.productUpdates,
      workspaceActivity: row.workspaceActivity,
      securityNotices: row.securityNotices,
      dailyDigestTime: row.dailyDigestTime,
      weeklyReportDay: row.weeklyReportDay,
      quietHoursStart: row.quietHoursStart,
      quietHoursEnd: row.quietHoursEnd,
    };
  }

  private userAccessibilityValues(
    row: UserAccessibilitySettingsValues | null,
  ): Partial<UserAccessibilitySettingsValues> {
    if (!row) return {};

    return {
      reducedMotion: row.reducedMotion,
      contrastPreference: row.contrastPreference,
      focusIndicators: row.focusIndicators,
      textDensity: row.textDensity,
      screenReaderLabels: row.screenReaderLabels,
      keyboardShortcuts: row.keyboardShortcuts,
    };
  }

  private definedValues<T extends object>(value: T): Partial<T> {
    return Object.fromEntries(
      Object.entries(value).filter(([, item]) => item !== undefined),
    ) as Partial<T>;
  }
}
