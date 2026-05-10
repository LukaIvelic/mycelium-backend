import { Module } from '@nestjs/common';
import { JwtAuthModule } from '@/common/auth/jwt-auth.module';
import { ApiKeyModule } from '../api-key/api-key.module';
import { IntegrationModule } from '../integration/integration.module';
import { LogDetailModule } from '../log-detail/log-detail.module';
import { ProjectModule } from '../project/project.module';
import { LogController } from './log.controller';
import { LogService } from './log.service';

@Module({
  imports: [
    JwtAuthModule,
    ApiKeyModule,
    IntegrationModule,
    ProjectModule,
    LogDetailModule,
  ],
  controllers: [LogController],
  providers: [LogService],
  exports: [LogService],
})
export class LogModule {}
