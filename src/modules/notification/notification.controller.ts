import { Body, Controller, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import type { Notification } from '@/database';
import {
  ApiListNotifications,
  ApiMarkAllNotificationsRead,
  ApiMarkNotificationRead,
} from './notification.decorator';
import {
  ListNotificationsQueryDto,
  MarkAllNotificationsReadDto,
} from './notification.dto';
import { NotificationService } from './notification.service';

@ApiTags('notifications')
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @ApiListNotifications()
  findMine(
    @CurrentUser() userId: string,
    @Query() query: ListNotificationsQueryDto,
  ): Promise<Notification[]> {
    return this.notificationService.findForUser(userId, {
      limit: query.limit === undefined ? undefined : Number(query.limit),
      projectId: query.projectId,
      unreadOnly:
        query.unreadOnly === undefined
          ? undefined
          : query.unreadOnly === 'true',
    });
  }

  @ApiMarkNotificationRead()
  markRead(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() userId: string,
  ): Promise<Notification> {
    return this.notificationService.markRead(id, userId);
  }

  @ApiMarkAllNotificationsRead()
  markAllRead(
    @CurrentUser() userId: string,
    @Body() dto: MarkAllNotificationsReadDto,
  ): Promise<void> {
    return this.notificationService.markAllRead(userId, dto.projectId);
  }
}
