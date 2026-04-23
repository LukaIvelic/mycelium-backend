import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Log } from '../log/log.entity';
import { ProjectModule } from '../project/project.module';
import { ServiceRegistryModule } from '../service-registry/service-registry.module';
import { ReactFlowController } from './react-flow.controller';
import { ReactFlow } from './react-flow.entity';
import { ReactFlowService } from './react-flow.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ReactFlow, Log]),
    AuthModule,
    ProjectModule,
    ServiceRegistryModule,
  ],
  controllers: [ReactFlowController],
  providers: [ReactFlowService],
  exports: [ReactFlowService],
})
export class ReactFlowModule {}
