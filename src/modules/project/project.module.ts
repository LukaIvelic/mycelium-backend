import { forwardRef, Module } from '@nestjs/common';
import { ProjectOwnershipGuard } from '@/modules/project/project-ownership.guard';
import { ApiKeyModule } from '../api-key/api-key.module';
import { AuthModule } from '../auth/auth.module';
import { ProjectController } from './project.controller';
import { ProjectService } from './project.service';

@Module({
  imports: [forwardRef(() => AuthModule), ApiKeyModule],
  controllers: [ProjectController],
  providers: [ProjectService, ProjectOwnershipGuard],
  exports: [ProjectService, ProjectOwnershipGuard],
})
export class ProjectModule {}
