import { Controller, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import type { Integration } from '@/database';
import { ProjectService } from '../project/project.service';
import { ApiGetIntegration } from './integration.decorator';
import { IntegrationService } from './integration.service';

@ApiTags('integrations')
@Controller('integrations')
export class IntegrationController {
  constructor(
    private readonly integrationService: IntegrationService,
    private readonly projectService: ProjectService,
  ) {}

  @ApiGetIntegration()
  async findById(
    @Param('integrationId', ParseUUIDPipe) integrationId: string,
    @CurrentUser() userId: string,
  ): Promise<Integration> {
    const integration = await this.integrationService.findById(integrationId);
    await this.projectService.findOne(integration.projectId, userId);
    return integration;
  }
}
