import { applyDecorators, Get, Patch, Post, UseGuards } from '@nestjs/common';
import {
  ApiOAuth2,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtGuard } from '@/common/guards/jwt.guard';
import { NotificationResponse } from './notification.dto';

export function ApiListNotifications() {
  return applyDecorators(
    Get(),
    UseGuards(JwtGuard),
    ApiOAuth2([]),
    ApiOperation({ summary: "List the current user's notifications" }),
    ApiQuery({ name: 'projectId', required: false, type: String }),
    ApiQuery({ name: 'unreadOnly', required: false, type: Boolean }),
    ApiQuery({ name: 'limit', required: false, type: Number }),
    ApiResponse({
      status: 200,
      description: 'Notifications found',
      type: [NotificationResponse],
    }),
  );
}

export function ApiMarkNotificationRead() {
  return applyDecorators(
    Patch(':id/read'),
    UseGuards(JwtGuard),
    ApiOAuth2([]),
    ApiOperation({ summary: 'Mark a notification as read' }),
    ApiParam({ name: 'id', type: 'string', format: 'uuid' }),
    ApiResponse({
      status: 200,
      description: 'Notification marked read',
      type: NotificationResponse,
    }),
  );
}

export function ApiMarkAllNotificationsRead() {
  return applyDecorators(
    Post('read-all'),
    UseGuards(JwtGuard),
    ApiOAuth2([]),
    ApiOperation({ summary: "Mark the current user's notifications as read" }),
    ApiResponse({ status: 200, description: 'Notifications marked read' }),
  );
}
