import { Module } from '@nestjs/common';
import { JwtAuthModule } from '@/common/auth/jwt-auth.module';
import { SettingsModule } from '../settings/settings.module';
import { UserProfileController } from './user-profile.controller';
import { UserProfileRepository } from './user-profile.repository';
import { UserProfileService } from './user-profile.service';

@Module({
  imports: [JwtAuthModule, SettingsModule],
  controllers: [UserProfileController],
  providers: [UserProfileService, UserProfileRepository],
  exports: [UserProfileService],
})
export class UserProfileModule {}
