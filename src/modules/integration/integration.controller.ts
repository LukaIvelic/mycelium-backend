import { Body, Controller, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import type { ApiKey, Integration, Project } from '@/database';
import { CurrentApiKey } from '../api-key/current-api-key.decorator';
import { ProjectService } from '../project/project.service';
import {
  CommunicationSettingsDto,
  CommunicationSettingsResponse,
  PerformanceSettingsDto,
  PerformanceSettingsResponse,
  RuntimeSettingsQueryDto,
  RuntimeSettingsResponse,
} from '../settings/settings.dto';
import { SettingsService } from '../settings/settings.service';
import {
  ApiCreateIntegration,
  ApiDeleteIntegration,
  ApiDeleteIntegrationCommunicationSettings,
  ApiDeleteIntegrationPerformanceSettings,
  ApiGetIntegration,
  ApiGetIntegrationCommunicationSettings,
  ApiGetIntegrationPerformanceSettings,
  ApiGetIntegrationRuntimeSettings,
  ApiListIntegrations,
  ApiReplaceIntegrationCommunicationSettings,
  ApiReplaceIntegrationPerformanceSettings,
  ApiUpdateIntegration,
  ApiUpdateIntegrationCommunicationSettings,
  ApiUpdateIntegrationPerformanceSettings,
} from './integration.decorator';
import {
  CreateIntegrationDto,
  ListIntegrationsQueryDto,
  UpdateIntegrationDto,
} from './integration.dto';
import { IntegrationService } from './integration.service';

@ApiTags('integrations')
@Controller('integrations')
export class IntegrationController {
  constructor(
    private readonly integrationService: IntegrationService,
    private readonly projectService: ProjectService,
    private readonly settingsService: SettingsService,
  ) {}

  @ApiListIntegrations()
  async findByProjectId(
    @Query() query: ListIntegrationsQueryDto,
    @CurrentUser() userId: string,
  ): Promise<Integration[]> {
    await this.projectService.findOne(query.projectId, userId);
    return this.integrationService.findByProjectId(query.projectId);
  }

  @ApiGetIntegrationRuntimeSettings()
  findRuntimeSettings(
    @Query() query: RuntimeSettingsQueryDto,
    @CurrentApiKey() apiKey: ApiKey,
  ): Promise<RuntimeSettingsResponse> {
    return this.integrationService.findRuntimeSettings(apiKey, query.origin);
  }

  @ApiCreateIntegration()
  async create(
    @Body() dto: CreateIntegrationDto,
    @CurrentUser() userId: string,
  ): Promise<Integration> {
    const project = await this.projectService.findOne(dto.projectId, userId);
    await this.projectService.assertCanManageProject(project, userId);
    return this.integrationService.create(dto);
  }

  @ApiGetIntegration()
  async findById(
    @Param('integrationId', ParseUUIDPipe) integrationId: string,
    @CurrentUser() userId: string,
  ): Promise<Integration> {
    const integration = await this.integrationService.findById(integrationId);
    await this.projectService.findOne(integration.projectId, userId);
    return integration;
  }

  @ApiUpdateIntegration()
  async update(
    @Param('integrationId', ParseUUIDPipe) integrationId: string,
    @CurrentUser() userId: string,
    @Body() dto: UpdateIntegrationDto,
  ): Promise<Integration> {
    const { integration, project } = await this.findIntegrationProject(
      integrationId,
      userId,
    );
    await this.projectService.assertCanManageProject(project, userId);
    return this.integrationService.update(integration, dto);
  }

  @ApiDeleteIntegration()
  async delete(
    @Param('integrationId', ParseUUIDPipe) integrationId: string,
    @CurrentUser() userId: string,
  ): Promise<void> {
    const { integration, project } = await this.findIntegrationProject(
      integrationId,
      userId,
    );
    await this.projectService.assertCanManageProject(project, userId);
    return this.integrationService.delete(integration);
  }

  @ApiGetIntegrationPerformanceSettings()
  async findPerformanceSettings(
    @Param('integrationId', ParseUUIDPipe) integrationId: string,
    @CurrentUser() userId: string,
  ): Promise<PerformanceSettingsResponse> {
    await this.findIntegrationProject(integrationId, userId);
    return this.settingsService.findIntegrationPerformance(integrationId);
  }

  @ApiReplaceIntegrationPerformanceSettings()
  async replacePerformanceSettings(
    @Param('integrationId', ParseUUIDPipe) integrationId: string,
    @CurrentUser() userId: string,
    @Body() dto: PerformanceSettingsDto,
  ): Promise<PerformanceSettingsResponse> {
    const { project } = await this.findIntegrationProject(
      integrationId,
      userId,
    );
    await this.projectService.assertCanManageProject(project, userId);
    return this.settingsService.replaceIntegrationPerformance(
      integrationId,
      dto,
    );
  }

  @ApiUpdateIntegrationPerformanceSettings()
  async updatePerformanceSettings(
    @Param('integrationId', ParseUUIDPipe) integrationId: string,
    @CurrentUser() userId: string,
    @Body() dto: PerformanceSettingsDto,
  ): Promise<PerformanceSettingsResponse> {
    const { project } = await this.findIntegrationProject(
      integrationId,
      userId,
    );
    await this.projectService.assertCanManageProject(project, userId);
    return this.settingsService.updateIntegrationPerformance(
      integrationId,
      dto,
    );
  }

  @ApiDeleteIntegrationPerformanceSettings()
  async deletePerformanceSettings(
    @Param('integrationId', ParseUUIDPipe) integrationId: string,
    @CurrentUser() userId: string,
  ): Promise<void> {
    const { project } = await this.findIntegrationProject(
      integrationId,
      userId,
    );
    await this.projectService.assertCanManageProject(project, userId);
    return this.settingsService.deleteIntegrationPerformance(integrationId);
  }

  @ApiGetIntegrationCommunicationSettings()
  async findCommunicationSettings(
    @Param('integrationId', ParseUUIDPipe) integrationId: string,
    @CurrentUser() userId: string,
  ): Promise<CommunicationSettingsResponse> {
    await this.findIntegrationProject(integrationId, userId);
    return this.settingsService.findIntegrationCommunication(integrationId);
  }

  @ApiReplaceIntegrationCommunicationSettings()
  async replaceCommunicationSettings(
    @Param('integrationId', ParseUUIDPipe) integrationId: string,
    @CurrentUser() userId: string,
    @Body() dto: CommunicationSettingsDto,
  ): Promise<CommunicationSettingsResponse> {
    const { project } = await this.findIntegrationProject(
      integrationId,
      userId,
    );
    await this.projectService.assertCanManageProject(project, userId);
    return this.settingsService.replaceIntegrationCommunication(
      integrationId,
      dto,
    );
  }

  @ApiUpdateIntegrationCommunicationSettings()
  async updateCommunicationSettings(
    @Param('integrationId', ParseUUIDPipe) integrationId: string,
    @CurrentUser() userId: string,
    @Body() dto: CommunicationSettingsDto,
  ): Promise<CommunicationSettingsResponse> {
    const { project } = await this.findIntegrationProject(
      integrationId,
      userId,
    );
    await this.projectService.assertCanManageProject(project, userId);
    return this.settingsService.updateIntegrationCommunication(
      integrationId,
      dto,
    );
  }

  @ApiDeleteIntegrationCommunicationSettings()
  async deleteCommunicationSettings(
    @Param('integrationId', ParseUUIDPipe) integrationId: string,
    @CurrentUser() userId: string,
  ): Promise<void> {
    const { project } = await this.findIntegrationProject(
      integrationId,
      userId,
    );
    await this.projectService.assertCanManageProject(project, userId);
    return this.settingsService.deleteIntegrationCommunication(integrationId);
  }

  private async findIntegrationProject(
    integrationId: string,
    userId: string,
  ): Promise<{ integration: Integration; project: Project }> {
    const integration = await this.integrationService.findById(integrationId);
    const project = await this.projectService.findOne(
      integration.projectId,
      userId,
    );

    return { integration, project };
  }
}
