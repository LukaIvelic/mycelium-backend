import {
  applyDecorators,
  Delete,
  Get,
  HttpCode,
  Patch,
  UseGuards,
} from '@nestjs/common';
import {
  ApiOAuth2,
  ApiOperation,
  ApiParam,
  ApiProperty,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtGuard } from '@/common/guards/jwt.guard';
import {
  UserAccessibilitySettingsResponse,
  UserNotificationSettingsResponse,
} from '../settings/settings.dto';

export class UserProfileResponse {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  user_id!: string;

  @ApiProperty({ example: 'John' })
  first_name!: string;

  @ApiProperty({ example: 'Doe' })
  last_name!: string;

  @ApiProperty({ example: 'johdoe' })
  username!: string;

  @ApiProperty({ example: '#7f4fd1' })
  random_profile_hex!: string;

  @ApiProperty({ example: 'JD' })
  initials!: string;

  @ApiProperty({ example: 'john.doe@example.com' })
  email!: string;

  @ApiProperty({ example: 'Backend engineer', nullable: true })
  bio!: string | null;

  @ApiProperty({ example: 'Software Engineer', nullable: true })
  job_title!: string | null;

  @ApiProperty({ example: 'Mycelium', nullable: true })
  company!: string | null;

  @ApiProperty({ example: 'Zagreb, Croatia' })
  location!: string;

  @ApiProperty({ example: 'https://example.com/avatar.png', nullable: true })
  avatar_url!: string | null;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  created_at!: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  updated_at!: Date;
}

export function ApiFindMyUserProfile() {
  return applyDecorators(
    Get('me'),
    UseGuards(JwtGuard),
    ApiOAuth2([]),
    ApiOperation({ summary: 'Get the currently authenticated user profile' }),
    ApiResponse({
      status: 200,
      description: 'User profile found',
      type: UserProfileResponse,
    }),
  );
}

export function ApiGetUserProfile() {
  return applyDecorators(
    Get(':id'),
    UseGuards(JwtGuard),
    ApiOAuth2([]),
    ApiOperation({ summary: 'Get a user profile by user ID' }),
    ApiParam({ name: 'id', type: 'string', format: 'uuid' }),
    ApiResponse({
      status: 200,
      description: 'User profile found',
      type: UserProfileResponse,
    }),
    ApiResponse({ status: 404, description: 'User profile not found' }),
  );
}

export function ApiUpdateUserProfile() {
  return applyDecorators(
    Patch(':id'),
    UseGuards(JwtGuard),
    ApiOAuth2([]),
    ApiOperation({ summary: 'Update a user profile' }),
    ApiParam({ name: 'id', type: 'string', format: 'uuid' }),
    ApiResponse({
      status: 200,
      description: 'User profile updated',
      type: UserProfileResponse,
    }),
    ApiResponse({ status: 404, description: 'User profile not found' }),
  );
}

export function ApiGetUserNotificationSettings() {
  return applyDecorators(
    Get('me/settings/notifications'),
    UseGuards(JwtGuard),
    ApiOAuth2([]),
    ApiOperation({ summary: 'Get current user notification settings' }),
    ApiResponse({
      status: 200,
      description: 'Notification settings found',
      type: UserNotificationSettingsResponse,
    }),
  );
}

export function ApiUpdateUserNotificationSettings() {
  return applyDecorators(
    Patch('me/settings/notifications'),
    UseGuards(JwtGuard),
    ApiOAuth2([]),
    ApiOperation({ summary: 'Update current user notification settings' }),
    ApiResponse({
      status: 200,
      description: 'Notification settings updated',
      type: UserNotificationSettingsResponse,
    }),
  );
}

export function ApiDeleteUserNotificationSettings() {
  return applyDecorators(
    Delete('me/settings/notifications'),
    UseGuards(JwtGuard),
    HttpCode(204),
    ApiOAuth2([]),
    ApiOperation({ summary: 'Reset current user notification settings' }),
    ApiResponse({ status: 204, description: 'Notification settings reset' }),
  );
}

export function ApiGetUserAccessibilitySettings() {
  return applyDecorators(
    Get('me/settings/accessibility'),
    UseGuards(JwtGuard),
    ApiOAuth2([]),
    ApiOperation({ summary: 'Get current user accessibility settings' }),
    ApiResponse({
      status: 200,
      description: 'Accessibility settings found',
      type: UserAccessibilitySettingsResponse,
    }),
  );
}

export function ApiUpdateUserAccessibilitySettings() {
  return applyDecorators(
    Patch('me/settings/accessibility'),
    UseGuards(JwtGuard),
    ApiOAuth2([]),
    ApiOperation({ summary: 'Update current user accessibility settings' }),
    ApiResponse({
      status: 200,
      description: 'Accessibility settings updated',
      type: UserAccessibilitySettingsResponse,
    }),
  );
}

export function ApiDeleteUserAccessibilitySettings() {
  return applyDecorators(
    Delete('me/settings/accessibility'),
    UseGuards(JwtGuard),
    HttpCode(204),
    ApiOAuth2([]),
    ApiOperation({ summary: 'Reset current user accessibility settings' }),
    ApiResponse({ status: 204, description: 'Accessibility settings reset' }),
  );
}
