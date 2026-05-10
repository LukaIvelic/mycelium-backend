import {
  BadRequestException,
  Body,
  Controller,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import type { Project } from '@/database';
import { Errors } from '@/lib/constants/errors';
import { CurrentProject } from '@/modules/project/current-project.decorator';
import {
  ApiAddApiKeyToProject,
  ApiCheckProjectApiKey,
  ApiCreateProject,
  ApiDeleteProject,
  ApiFindMyProjects,
  ApiFindProjectByApiKey,
  ApiGetProject,
  ApiUpdateProject,
} from './project.decorator';
import type {
  AddApiKeyDto,
  AddApiKeyToProjectResponse,
  CreateProjectDto,
  UpdateProjectDto,
} from './project.dto';
import { ProjectService } from './project.service';

@ApiTags('projects')
@Controller('projects')
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @ApiFindMyProjects()
  findMine(
    @CurrentUser() userId: string,
    @Query('hasApiKey') hasApiKey?: string,
  ): Promise<Project[]> {
    return this.projectService.findByUserId(
      userId,
      this.parseHasApiKey(hasApiKey),
    );
  }

  @ApiGetProject()
  findOne(@CurrentProject() project: Project): Project {
    return project;
  }

  @ApiCheckProjectApiKey()
  async hasActiveApiKey(
    @CurrentProject() project: Project,
  ): Promise<{ hasActiveApiKey: boolean }> {
    const result = await this.projectService.hasActiveApiKey(project);
    return { hasActiveApiKey: result };
  }

  @ApiFindProjectByApiKey()
  findByApiKeyId(
    @Query('apiKeyId', ParseUUIDPipe) apiKeyId: string,
    @CurrentUser() userId: string,
  ): Promise<Project> {
    return this.projectService.findByApiKeyId(apiKeyId, userId);
  }

  @ApiCreateProject()
  create(
    @Body() dto: CreateProjectDto,
    @CurrentUser() userId: string,
  ): Promise<Project> {
    return this.projectService.create(dto, userId);
  }

  @ApiUpdateProject()
  update(
    @CurrentProject() project: Project,
    @Body() dto: UpdateProjectDto,
  ): Promise<Project> {
    return this.projectService.update(project, dto);
  }

  @ApiDeleteProject()
  delete(@CurrentProject() project: Project): Promise<void> {
    return this.projectService.delete(project);
  }

  @ApiAddApiKeyToProject()
  addApiKey(
    @CurrentProject() project: Project,
    @Body() dto: AddApiKeyDto,
  ): Promise<AddApiKeyToProjectResponse> {
    return this.projectService.addApiKeyToProject(project, dto.name);
  }

  private parseHasApiKey(value?: string): boolean | undefined {
    if (value === undefined) return undefined;
    if (value === 'true') return true;
    if (value === 'false') return false;
    throw new BadRequestException(Errors.Project.InvalidHasApiKeyParam);
  }
}
