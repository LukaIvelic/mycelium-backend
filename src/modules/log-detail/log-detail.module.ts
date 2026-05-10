import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ProjectModule } from '../project/project.module';
import { LogDetailController } from './log-detail.controller';
import { LogDetailService } from './log-detail.service';

@Module({
  imports: [AuthModule, ProjectModule],
  controllers: [LogDetailController],
  providers: [LogDetailService],
  exports: [LogDetailService],
})
export class LogDetailModule {}
