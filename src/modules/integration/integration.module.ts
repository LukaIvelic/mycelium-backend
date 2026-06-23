import { Module } from '@nestjs/common';
import { JwtAuthModule } from '@/common/auth/jwt-auth.module';
import { ApiKeyModule } from '../api-key/api-key.module';
import { FlowModule } from '../flow/flow.module';
import { ProjectModule } from '../project/project.module';
import { SettingsModule } from '../settings/settings.module';
import { IntegrationController } from './integration.controller';
import { IntegrationRepository } from './integration.repository';
import { IntegrationService } from './integration.service';

@Module({
  imports: [
    JwtAuthModule,
    ApiKeyModule,
    FlowModule,
    ProjectModule,
    SettingsModule,
  ],
  controllers: [IntegrationController],
  providers: [IntegrationService, IntegrationRepository],
  exports: [IntegrationService],
})
export class IntegrationModule {}
