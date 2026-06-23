import { Injectable, NotFoundException } from '@nestjs/common';
import type { Log, NewNotification, Notification } from '@/database';
import type { Database } from '@/database/database.types';
import { Errors } from '@/lib/constants/errors';
import { SettingsService } from '../settings/settings.service';
import { NotificationRepository } from './notification.repository';

const DEFAULT_NOTIFICATION_LIMIT = 50;
const MAX_NOTIFICATION_LIMIT = 100;

export type NotificationPayload = Pick<
  NewNotification,
  'description' | 'projectId' | 'severity' | 'title' | 'type'
>;

/** Creates and manages user notifications. */
@Injectable()
export class NotificationService {
  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly settingsService: SettingsService,
  ) {}

  /**
   * Lists notifications for a user.
   * @param userId Notification owner.
   * @param options Optional filters.
   * @returns Matching notifications.
   */
  findForUser(
    userId: string,
    options: {
      limit?: number;
      projectId?: string;
      unreadOnly?: boolean;
    },
  ): Promise<Notification[]> {
    return this.notificationRepository.findByUserId(userId, {
      limit: this.normalizeLimit(options.limit),
      projectId: options.projectId,
      unreadOnly: options.unreadOnly,
    });
  }

  /**
   * Creates a notification for one user.
   * @param userId Recipient user id.
   * @param payload Notification content.
   * @param tx Optional transaction handle.
   * @returns Inserted notification.
   */
  async createForUser(
    userId: string,
    payload: NotificationPayload,
    tx?: Database,
  ): Promise<Notification> {
    const [notification] = await this.notificationRepository.insertMany(
      [{ ...payload, userId }],
      tx,
    );
    return notification;
  }

  /**
   * Creates the same notification for every active project participant.
   * @param projectId Project identifier.
   * @param payload Notification content without project id.
   * @param tx Optional transaction handle.
   * @returns Inserted notifications.
   */
  async createForProjectUsers(
    projectId: string,
    payload: Omit<NotificationPayload, 'projectId'>,
    tx?: Database,
  ): Promise<Notification[]> {
    const recipientIds =
      await this.notificationRepository.findProjectRecipientIds(projectId, tx);

    return this.notificationRepository.insertMany(
      recipientIds.map((userId) => ({
        ...payload,
        projectId,
        userId,
      })),
      tx,
    );
  }

  /**
   * Creates request notifications from a log when the log is actionable.
   * @param log Created log row.
   * @param tx Optional transaction handle.
   * @returns A promise that resolves when notifications are inserted.
   */
  async createLogNotifications(log: Log, tx?: Database): Promise<void> {
    const requestLabel = `${log.statusCode} ${log.method} ${log.path}`;
    const settings = await this.settingsService.resolvePerformance(
      log.projectId,
      log.integrationId,
      tx,
    );

    if (
      settings.notifyOnFailedRequests &&
      log.statusCode >= settings.criticalStatusCode
    ) {
      await this.createForProjectUsers(
        log.projectId,
        {
          description: requestLabel,
          severity: 'critical',
          title: 'Server error',
          type: 'server_error',
        },
        tx,
      );
    } else if (
      settings.notifyOnFailedRequests &&
      log.statusCode >= settings.warningStatusCode
    ) {
      await this.createForProjectUsers(
        log.projectId,
        {
          description: requestLabel,
          severity: 'warning',
          title: 'Request warning',
          type: 'request_warning',
        },
        tx,
      );
    }

    if (
      settings.notifyOnSlowRequests &&
      log.durationMs >= settings.slowRequestThresholdMs
    ) {
      await this.createForProjectUsers(
        log.projectId,
        {
          description: `${log.durationMs} ms ${log.method} ${log.path}`,
          severity: 'warning',
          title: 'Slow request',
          type: 'slow_request',
        },
        tx,
      );
    }
  }

  /**
   * Marks a user notification as read.
   * @param id Notification identifier.
   * @param userId Notification owner.
   * @returns Updated notification.
   */
  async markRead(id: string, userId: string): Promise<Notification> {
    const notification = await this.notificationRepository.markRead(id, userId);
    if (!notification)
      throw new NotFoundException(Errors.Notification.NotFound);
    return notification;
  }

  /**
   * Marks matching user notifications as read.
   * @param userId Notification owner.
   * @param projectId Optional project scope.
   * @returns A promise that resolves when the update completes.
   */
  markAllRead(userId: string, projectId?: string): Promise<void> {
    return this.notificationRepository.markAllRead(userId, projectId);
  }

  private normalizeLimit(limit?: number): number {
    if (limit === undefined || Number.isNaN(limit)) {
      return DEFAULT_NOTIFICATION_LIMIT;
    }

    return Math.min(Math.max(limit, 1), MAX_NOTIFICATION_LIMIT);
  }
}
