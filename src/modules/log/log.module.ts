import { Module } from '@nestjs/common';
import { ApiKeyModule } from '../api-key/api-key.module';
import { AuthModule } from '../auth/auth.module';
import { LogDetailModule } from '../log-detail/log-detail.module';
import { ProjectModule } from '../project/project.module';
import { LogController } from './log.controller';
import { LogService } from './log.service';

@Module({
  imports: [AuthModule, ApiKeyModule, ProjectModule, LogDetailModule],
  controllers: [LogController],
  providers: [LogService],
  exports: [LogService],
})
export class LogModule {}
