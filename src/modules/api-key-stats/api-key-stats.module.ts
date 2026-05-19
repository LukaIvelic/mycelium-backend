import { Module } from '@nestjs/common';
import { JwtAuthModule } from '@/common/auth/jwt-auth.module';
import { ProjectModule } from '../project/project.module';
import { ApiKeyStatsController } from './api-key-stats.controller';
import { ApiKeyStatsService } from './api-key-stats.service';

@Module({
  imports: [JwtAuthModule, ProjectModule],
  controllers: [ApiKeyStatsController],
  providers: [ApiKeyStatsService],
  exports: [ApiKeyStatsService],
})
export class ApiKeyStatsModule {}
