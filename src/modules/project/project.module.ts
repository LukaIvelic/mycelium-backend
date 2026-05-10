import { Module } from '@nestjs/common';
import { JwtAuthModule } from '@/common/auth/jwt-auth.module';
import { ProjectOwnershipGuard } from '@/modules/project/project-ownership.guard';
import { ApiKeyModule } from '../api-key/api-key.module';
import { ProjectController } from './project.controller';
import { ProjectService } from './project.service';

@Module({
  imports: [JwtAuthModule, ApiKeyModule],
  controllers: [ProjectController],
  providers: [ProjectService, ProjectOwnershipGuard],
  exports: [ProjectService, ProjectOwnershipGuard],
})
export class ProjectModule {}
