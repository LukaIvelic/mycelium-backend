import { Module } from '@nestjs/common';
import { JwtAuthModule } from '@/common/auth/jwt-auth.module';
import { ProjectModule } from '../project/project.module';
import { LogDetailController } from './log-detail.controller';
import { LogDetailService } from './log-detail.service';

@Module({
  imports: [JwtAuthModule, ProjectModule],
  controllers: [LogDetailController],
  providers: [LogDetailService],
  exports: [LogDetailService],
})
export class LogDetailModule {}
