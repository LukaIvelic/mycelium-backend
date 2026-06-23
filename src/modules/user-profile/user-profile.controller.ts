import { Body, Controller, ForbiddenException, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Errors } from '@/lib/constants/errors';
import {
  UserAccessibilitySettingsDto,
  UserAccessibilitySettingsResponse,
  UserNotificationSettingsDto,
  UserNotificationSettingsResponse,
} from '../settings/settings.dto';
import { SettingsService } from '../settings/settings.service';
import {
  ApiDeleteUserAccessibilitySettings,
  ApiDeleteUserNotificationSettings,
  ApiFindMyUserProfile,
  ApiGetUserAccessibilitySettings,
  ApiGetUserNotificationSettings,
  ApiGetUserProfile,
  ApiUpdateUserAccessibilitySettings,
  ApiUpdateUserNotificationSettings,
  ApiUpdateUserProfile,
} from './user-profile.decorator';
import { UpdateUserProfileDto } from './user-profile.dto';
import { toUserProfile, type UserProfileResponse } from './user-profile.mapper';
import { UserProfileService } from './user-profile.service';

@ApiTags('user-profiles')
@Controller('user-profiles')
export class UserProfileController {
  constructor(
    private readonly userProfileService: UserProfileService,
    private readonly settingsService: SettingsService,
  ) {}

  @ApiFindMyUserProfile()
  async findMe(@CurrentUser() userId: string): Promise<UserProfileResponse> {
    const profile = await this.userProfileService.findOne(userId);
    return toUserProfile(profile);
  }

  @ApiGetUserProfile()
  async findOne(
    @Param('id') id: string,
    @CurrentUser() userId: string,
  ): Promise<UserProfileResponse> {
    if (id !== userId) throw new ForbiddenException(Errors.UserProfile.NotSelf);
    const profile = await this.userProfileService.findOne(id);
    return toUserProfile(profile);
  }

  @ApiUpdateUserProfile()
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserProfileDto,
    @CurrentUser() userId: string,
  ): Promise<UserProfileResponse> {
    if (id !== userId) throw new ForbiddenException(Errors.UserProfile.NotSelf);
    const profile = await this.userProfileService.update(id, dto);
    return toUserProfile(profile);
  }

  @ApiGetUserNotificationSettings()
  findNotificationSettings(
    @CurrentUser() userId: string,
  ): Promise<UserNotificationSettingsResponse> {
    return this.settingsService.findUserNotification(userId);
  }

  @ApiUpdateUserNotificationSettings()
  updateNotificationSettings(
    @CurrentUser() userId: string,
    @Body() dto: UserNotificationSettingsDto,
  ): Promise<UserNotificationSettingsResponse> {
    return this.settingsService.updateUserNotification(userId, dto);
  }

  @ApiDeleteUserNotificationSettings()
  deleteNotificationSettings(@CurrentUser() userId: string): Promise<void> {
    return this.settingsService.deleteUserNotification(userId);
  }

  @ApiGetUserAccessibilitySettings()
  findAccessibilitySettings(
    @CurrentUser() userId: string,
  ): Promise<UserAccessibilitySettingsResponse> {
    return this.settingsService.findUserAccessibility(userId);
  }

  @ApiUpdateUserAccessibilitySettings()
  updateAccessibilitySettings(
    @CurrentUser() userId: string,
    @Body() dto: UserAccessibilitySettingsDto,
  ): Promise<UserAccessibilitySettingsResponse> {
    return this.settingsService.updateUserAccessibility(userId, dto);
  }

  @ApiDeleteUserAccessibilitySettings()
  deleteAccessibilitySettings(@CurrentUser() userId: string): Promise<void> {
    return this.settingsService.deleteUserAccessibility(userId);
  }
}
