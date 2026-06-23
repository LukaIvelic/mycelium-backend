import { Module } from '@nestjs/common';
import { JwtAuthModule } from '@/common/auth/jwt-auth.module';
import { ProjectOwnershipGuard } from '@/modules/project/project-ownership.guard';
import { ApiKeyModule } from '../api-key/api-key.module';
import { NotificationModule } from '../notification/notification.module';
import { SettingsModule } from '../settings/settings.module';
import { UserModule } from '../user/user.module';
import { ProjectController } from './project.controller';
import { ProjectRepository } from './project.repository';
import { ProjectService } from './project.service';

@Module({
  imports: [
    JwtAuthModule,
    ApiKeyModule,
    UserModule,
    NotificationModule,
    SettingsModule,
  ],
  controllers: [ProjectController],
  providers: [ProjectService, ProjectRepository, ProjectOwnershipGuard],
  exports: [ProjectService, ProjectOwnershipGuard],
})
export class ProjectModule {}
