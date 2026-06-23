import { Module } from '@nestjs/common';
import { JwtAuthModule } from '@/common/auth/jwt-auth.module';
import { SettingsModule } from '../settings/settings.module';
import { NotificationController } from './notification.controller';
import { NotificationRepository } from './notification.repository';
import { NotificationService } from './notification.service';

@Module({
  imports: [JwtAuthModule, SettingsModule],
  controllers: [NotificationController],
  providers: [NotificationService, NotificationRepository],
  exports: [NotificationService],
})
export class NotificationModule {}
