import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import {
  type IntegrationCommunicationSetting,
  type IntegrationPerformanceSetting,
  integrationCommunicationSettings,
  integrationPerformanceSettings,
  type ProjectCommunicationSetting,
  type ProjectPerformanceSetting,
  type ProjectRegionSetting,
  projectCommunicationSettings,
  projectPerformanceSettings,
  projectRegionSettings,
  type UserAccessibilitySetting,
  type UserNotificationSetting,
  userAccessibilitySettings,
  userNotificationSettings,
} from '@/database';
import { DRIZZLE } from '@/database/database.module';
import type { Database } from '@/database/database.types';
import type {
  CommunicationSettingsValues,
  PerformanceSettingsValues,
  ProjectRegionSettingsValues,
  UserAccessibilitySettingsValues,
  UserNotificationSettingsValues,
} from './settings.types';

@Injectable()
export class SettingsRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async findProjectPerformance(
    projectId: string,
    tx?: Database,
  ): Promise<ProjectPerformanceSetting | null> {
    const [row] = await (tx ?? this.db)
      .select()
      .from(projectPerformanceSettings)
      .where(eq(projectPerformanceSettings.projectId, projectId));
    return row ?? null;
  }

  async upsertProjectPerformance(
    projectId: string,
    values: PerformanceSettingsValues,
  ): Promise<ProjectPerformanceSetting> {
    const now = new Date();
    const [row] = await this.db
      .insert(projectPerformanceSettings)
      .values({ projectId, ...values, updatedAt: now })
      .onConflictDoUpdate({
        target: projectPerformanceSettings.projectId,
        set: { ...values, updatedAt: now },
      })
      .returning();
    return row;
  }

  async deleteProjectPerformance(projectId: string): Promise<void> {
    await this.db
      .delete(projectPerformanceSettings)
      .where(eq(projectPerformanceSettings.projectId, projectId));
  }

  async findProjectCommunication(
    projectId: string,
    tx?: Database,
  ): Promise<ProjectCommunicationSetting | null> {
    const [row] = await (tx ?? this.db)
      .select()
      .from(projectCommunicationSettings)
      .where(eq(projectCommunicationSettings.projectId, projectId));
    return row ?? null;
  }

  async upsertProjectCommunication(
    projectId: string,
    values: CommunicationSettingsValues,
  ): Promise<ProjectCommunicationSetting> {
    const now = new Date();
    const [row] = await this.db
      .insert(projectCommunicationSettings)
      .values({ projectId, ...values, updatedAt: now })
      .onConflictDoUpdate({
        target: projectCommunicationSettings.projectId,
        set: { ...values, updatedAt: now },
      })
      .returning();
    return row;
  }

  async deleteProjectCommunication(projectId: string): Promise<void> {
    await this.db
      .delete(projectCommunicationSettings)
      .where(eq(projectCommunicationSettings.projectId, projectId));
  }

  async findProjectRegion(
    projectId: string,
  ): Promise<ProjectRegionSetting | null> {
    const [row] = await this.db
      .select()
      .from(projectRegionSettings)
      .where(eq(projectRegionSettings.projectId, projectId));
    return row ?? null;
  }

  async upsertProjectRegion(
    projectId: string,
    values: ProjectRegionSettingsValues,
  ): Promise<ProjectRegionSetting> {
    const now = new Date();
    const [row] = await this.db
      .insert(projectRegionSettings)
      .values({ projectId, ...values, updatedAt: now })
      .onConflictDoUpdate({
        target: projectRegionSettings.projectId,
        set: { ...values, updatedAt: now },
      })
      .returning();
    return row;
  }

  async deleteProjectRegion(projectId: string): Promise<void> {
    await this.db
      .delete(projectRegionSettings)
      .where(eq(projectRegionSettings.projectId, projectId));
  }

  async findIntegrationPerformance(
    integrationId: string,
    tx?: Database,
  ): Promise<IntegrationPerformanceSetting | null> {
    const [row] = await (tx ?? this.db)
      .select()
      .from(integrationPerformanceSettings)
      .where(eq(integrationPerformanceSettings.integrationId, integrationId));
    return row ?? null;
  }

  async upsertIntegrationPerformance(
    integrationId: string,
    values: PerformanceSettingsValues,
  ): Promise<IntegrationPerformanceSetting> {
    const now = new Date();
    const [row] = await this.db
      .insert(integrationPerformanceSettings)
      .values({ integrationId, ...values, updatedAt: now })
      .onConflictDoUpdate({
        target: integrationPerformanceSettings.integrationId,
        set: { ...values, updatedAt: now },
      })
      .returning();
    return row;
  }

  async deleteIntegrationPerformance(integrationId: string): Promise<void> {
    await this.db
      .delete(integrationPerformanceSettings)
      .where(eq(integrationPerformanceSettings.integrationId, integrationId));
  }

  async findIntegrationCommunication(
    integrationId: string,
    tx?: Database,
  ): Promise<IntegrationCommunicationSetting | null> {
    const [row] = await (tx ?? this.db)
      .select()
      .from(integrationCommunicationSettings)
      .where(eq(integrationCommunicationSettings.integrationId, integrationId));
    return row ?? null;
  }

  async upsertIntegrationCommunication(
    integrationId: string,
    values: CommunicationSettingsValues,
  ): Promise<IntegrationCommunicationSetting> {
    const now = new Date();
    const [row] = await this.db
      .insert(integrationCommunicationSettings)
      .values({ integrationId, ...values, updatedAt: now })
      .onConflictDoUpdate({
        target: integrationCommunicationSettings.integrationId,
        set: { ...values, updatedAt: now },
      })
      .returning();
    return row;
  }

  async deleteIntegrationCommunication(integrationId: string): Promise<void> {
    await this.db
      .delete(integrationCommunicationSettings)
      .where(eq(integrationCommunicationSettings.integrationId, integrationId));
  }

  async findUserNotification(
    userId: string,
  ): Promise<UserNotificationSetting | null> {
    const [row] = await this.db
      .select()
      .from(userNotificationSettings)
      .where(eq(userNotificationSettings.userId, userId));
    return row ?? null;
  }

  async upsertUserNotification(
    userId: string,
    values: UserNotificationSettingsValues,
  ): Promise<UserNotificationSetting> {
    const now = new Date();
    const [row] = await this.db
      .insert(userNotificationSettings)
      .values({ userId, ...values, updatedAt: now })
      .onConflictDoUpdate({
        target: userNotificationSettings.userId,
        set: { ...values, updatedAt: now },
      })
      .returning();
    return row;
  }

  async deleteUserNotification(userId: string): Promise<void> {
    await this.db
      .delete(userNotificationSettings)
      .where(eq(userNotificationSettings.userId, userId));
  }

  async findUserAccessibility(
    userId: string,
  ): Promise<UserAccessibilitySetting | null> {
    const [row] = await this.db
      .select()
      .from(userAccessibilitySettings)
      .where(eq(userAccessibilitySettings.userId, userId));
    return row ?? null;
  }

  async upsertUserAccessibility(
    userId: string,
    values: UserAccessibilitySettingsValues,
  ): Promise<UserAccessibilitySetting> {
    const now = new Date();
    const [row] = await this.db
      .insert(userAccessibilitySettings)
      .values({ userId, ...values, updatedAt: now })
      .onConflictDoUpdate({
        target: userAccessibilitySettings.userId,
        set: { ...values, updatedAt: now },
      })
      .returning();
    return row;
  }

  async deleteUserAccessibility(userId: string): Promise<void> {
    await this.db
      .delete(userAccessibilitySettings)
      .where(eq(userAccessibilitySettings.userId, userId));
  }
}
