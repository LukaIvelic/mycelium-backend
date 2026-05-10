import { forwardRef, Module } from '@nestjs/common';
import { ProjectController } from './project.controller';
import { AuthModule } from '../auth/auth.module';
import { ApiKeyModule } from '../api-key/api-key.module';
import { ProjectService } from './project.service';
import { ProjectOwnershipGuard } from '@/modules/project/project-ownership.guard';

@Module({
  imports: [forwardRef(() => AuthModule), ApiKeyModule],
  controllers: [ProjectController],
  providers: [ProjectService, ProjectOwnershipGuard],
  exports: [ProjectService, ProjectOwnershipGuard],
})
export class ProjectModule {}
