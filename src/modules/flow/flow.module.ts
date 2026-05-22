import { Module } from '@nestjs/common';
import { JwtAuthModule } from '@/common/auth/jwt-auth.module';
import { ProjectModule } from '../project/project.module';
import { FlowDataService } from './_services/data.service';
import { FlowGraphService } from './_services/graph.service';
import { FlowController } from './flow.controller';
import { FlowRepository } from './flow.repository';
import { FlowService } from './flow.service';

@Module({
  imports: [JwtAuthModule, ProjectModule],
  controllers: [FlowController],
  providers: [FlowService, FlowRepository, FlowDataService, FlowGraphService],
  exports: [FlowService],
})
export class FlowModule {}
