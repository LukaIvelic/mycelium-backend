import { Inject, Injectable } from '@nestjs/common';
import type { SQL } from 'drizzle-orm';
import { and, desc, eq, isNull } from 'drizzle-orm';
import {
  type NewNotification,
  type Notification,
  notifications,
  projectMembers,
  projects,
} from '@/database';
import { DRIZZLE } from '@/database/database.module';
import type { Database } from '@/database/database.types';

export interface FindNotificationsOptions {
  limit: number;
  projectId?: string;
  unreadOnly?: boolean;
}

/** Data access for user notifications. */
@Injectable()
export class NotificationRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  /**
   * Lists notifications owned by a user.
   * @param userId Notification owner.
   * @param options Optional project, unread, and limit filters.
   * @returns Matching notifications ordered newest first.
   */
  async findByUserId(
    userId: string,
    options: FindNotificationsOptions,
  ): Promise<Notification[]> {
    const conditions: SQL[] = [eq(notifications.userId, userId)];

    if (options.projectId !== undefined) {
      conditions.push(eq(notifications.projectId, options.projectId));
    }

    if (options.unreadOnly === true) {
      conditions.push(isNull(notifications.readAt));
    }

    return this.db
      .select()
      .from(notifications)
      .where(and(...conditions))
      .orderBy(desc(notifications.createdAt))
      .limit(options.limit);
  }

  /**
   * Inserts notification rows.
   * @param values Notification rows to insert.
   * @param tx Optional transaction handle.
   * @returns Inserted notifications.
   */
  async insertMany(
    values: NewNotification[],
    tx?: Database,
  ): Promise<Notification[]> {
    if (values.length === 0) return [];

    return (tx ?? this.db).insert(notifications).values(values).returning();
  }

  /**
   * Marks one notification as read if it belongs to the user.
   * @param id Notification identifier.
   * @param userId Notification owner.
   * @returns Updated notification, or `null` when not found.
   */
  async markRead(id: string, userId: string): Promise<Notification | null> {
    const [notification] = await this.db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
      .returning();

    return notification ?? null;
  }

  /**
   * Marks all matching user notifications as read.
   * @param userId Notification owner.
   * @param projectId Optional project scope.
   * @returns A promise that resolves when the update completes.
   */
  async markAllRead(userId: string, projectId?: string): Promise<void> {
    const conditions: SQL[] = [
      eq(notifications.userId, userId),
      isNull(notifications.readAt),
    ];

    if (projectId !== undefined) {
      conditions.push(eq(notifications.projectId, projectId));
    }

    await this.db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(and(...conditions));
  }

  /**
   * Finds owner and active member user ids for a project.
   * @param projectId Project identifier.
   * @param tx Optional transaction handle.
   * @returns Unique notification recipient user ids.
   */
  async findProjectRecipientIds(
    projectId: string,
    tx?: Database,
  ): Promise<string[]> {
    const db = tx ?? this.db;
    const [project] = await db
      .select({ ownerId: projects.userId })
      .from(projects)
      .where(eq(projects.id, projectId));

    if (!project) return [];

    const memberRows = await db
      .select({ userId: projectMembers.userId })
      .from(projectMembers)
      .where(
        and(
          eq(projectMembers.projectId, projectId),
          isNull(projectMembers.validTo),
        ),
      );

    return Array.from(
      new Set([project.ownerId, ...memberRows.map((row) => row.userId)]),
    );
  }
}
