import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiKeyModule } from '../api-key/api-key.module';
import { RegisteredService } from './registered-service.entity';
import { ServiceRegistryController } from './service-registry.controller';
import { ServiceRegistryService } from './service-registry.service';

@Module({
  imports: [TypeOrmModule.forFeature([RegisteredService]), ApiKeyModule],
  controllers: [ServiceRegistryController],
  providers: [ServiceRegistryService],
  exports: [ServiceRegistryService],
})
export class ServiceRegistryModule {}
