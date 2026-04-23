import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Log } from './log.entity';
import { LogDetail } from './log-detail.entity';
import { LogService } from './log.service';
import { LogController } from './log.controller';
import { ApiKeyModule } from '../api-key/api-key.module';
import { AuthModule } from '../auth/auth.module';
import { ProjectModule } from '../project/project.module';
import { ReactFlowModule } from '../react-flow/react-flow.module';
import { ServiceRegistryModule } from '../service-registry/service-registry.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Log, LogDetail]),
    ApiKeyModule,
    AuthModule,
    ProjectModule,
    ReactFlowModule,
    ServiceRegistryModule,
  ],
  controllers: [LogController],
  providers: [LogService],
  exports: [LogService],
})
export class LogModule {}
