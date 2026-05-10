import { Module } from '@nestjs/common';
import { JwtAuthModule } from '@/common/auth/jwt-auth.module';
import { ProjectModule } from '../project/project.module';
import { IntegrationController } from './integration.controller';
import { IntegrationService } from './integration.service';

@Module({
  imports: [JwtAuthModule, ProjectModule],
  controllers: [IntegrationController],
  providers: [IntegrationService],
  exports: [IntegrationService],
})
export class IntegrationModule {}
