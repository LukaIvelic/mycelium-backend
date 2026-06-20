import {
  BadRequestException,
  Body,
  Controller,
  Param,
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
  ApiAddProjectMember,
  ApiCheckProjectApiKey,
  ApiCreateProject,
  ApiDeleteProject,
  ApiFindMyProjects,
  ApiFindProjectByApiKey,
  ApiGetProject,
  ApiListProjectMembers,
  ApiRemoveProjectMember,
  ApiUpdateProject,
  ApiUpdateProjectMember,
} from './project.decorator';
import {
  AddApiKeyDto,
  AddApiKeyToProjectResponse,
  AddProjectMemberDto,
  CreateProjectDto,
  ProjectMemberResponse,
  ProjectSortDirection,
  ProjectSortField,
  type ProjectSortOptions,
  UpdateProjectDto,
  UpdateProjectMemberDto,
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
    @Query('field') field?: string,
    @Query('sort') sort?: string,
  ): Promise<Project[]> {
    const sortOptions = this.parseProjectSortOptions(field, sort);

    return this.projectService.findByUserId(
      userId,
      this.parseHasApiKey(hasApiKey),
      sortOptions,
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
    @CurrentUser() userId: string,
    @Body() dto: UpdateProjectDto,
  ): Promise<Project> {
    return this.projectService.update(project, dto, userId);
  }

  @ApiDeleteProject()
  delete(
    @CurrentProject() project: Project,
    @CurrentUser() userId: string,
  ): Promise<void> {
    return this.projectService.delete(project, userId);
  }

  @ApiAddApiKeyToProject()
  addApiKey(
    @CurrentProject() project: Project,
    @CurrentUser() userId: string,
    @Body() dto: AddApiKeyDto,
  ): Promise<AddApiKeyToProjectResponse> {
    return this.projectService.addApiKeyToProject(project, userId, dto.name);
  }

  @ApiListProjectMembers()
  findMembers(
    @CurrentProject() project: Project,
  ): Promise<ProjectMemberResponse[]> {
    return this.projectService.findMembers(project);
  }

  @ApiAddProjectMember()
  addMember(
    @CurrentProject() project: Project,
    @CurrentUser() userId: string,
    @Body() dto: AddProjectMemberDto,
  ): Promise<ProjectMemberResponse> {
    return this.projectService.addMember(project, userId, dto);
  }

  @ApiUpdateProjectMember()
  updateMember(
    @CurrentProject() project: Project,
    @CurrentUser() userId: string,
    @Param('userId', ParseUUIDPipe) memberUserId: string,
    @Body() dto: UpdateProjectMemberDto,
  ): Promise<ProjectMemberResponse> {
    return this.projectService.updateMember(project, userId, memberUserId, dto);
  }

  @ApiRemoveProjectMember()
  removeMember(
    @CurrentProject() project: Project,
    @CurrentUser() userId: string,
    @Param('userId', ParseUUIDPipe) memberUserId: string,
  ): Promise<void> {
    return this.projectService.removeMember(project, userId, memberUserId);
  }

  private parseHasApiKey(value?: string): boolean | undefined {
    if (value === undefined) return undefined;
    if (value === 'true') return true;
    if (value === 'false') return false;
    throw new BadRequestException(Errors.Project.InvalidHasApiKeyParam);
  }

  private parseProjectSortOptions(
    field?: string,
    sort?: string,
  ): ProjectSortOptions | undefined {
    if (field === undefined && sort === undefined) return undefined;

    const sortField = field ?? ProjectSortField.RecentActivity;
    const sortDirection = sort ?? ProjectSortDirection.Desc;
    this.validateProjectSortField(sortField);
    this.validateProjectSortDirection(sortDirection);

    return {
      field: sortField,
      sort: sortDirection,
    };
  }

  private validateProjectSortField(
    field: string,
  ): asserts field is ProjectSortField {
    const fields = Object.values(ProjectSortField);
    if (fields.includes(field as ProjectSortField)) return;

    throw new BadRequestException(Errors.Project.InvalidSortFieldParam);
  }

  private validateProjectSortDirection(
    sort: string,
  ): asserts sort is ProjectSortDirection {
    const directions = Object.values(ProjectSortDirection);
    if (directions.includes(sort as ProjectSortDirection)) return;

    throw new BadRequestException(Errors.Project.InvalidSortDirectionParam);
  }
}
