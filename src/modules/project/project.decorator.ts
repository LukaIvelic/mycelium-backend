import {
  applyDecorators,
  Delete,
  Get,
  HttpCode,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiOAuth2,
  ApiOperation,
  ApiParam,
  ApiProperty,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtGuard } from '@/common/guards/jwt.guard';
import { ProjectOwnershipGuard } from '@/modules/project/project-ownership.guard';
import {
  CommunicationSettingsResponse,
  PerformanceSettingsResponse,
  ProjectRegionSettingsResponse,
} from '@/modules/settings/settings.dto';
import {
  ProjectMemberResponse,
  ProjectSortDirection,
  ProjectSortField,
} from './project.dto';

export class ProjectResponse {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id!: string;

  @ApiProperty({ example: 'My project' })
  name!: string;

  @ApiProperty({ example: 'A short description', nullable: true })
  description!: string | null;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  user_id!: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  valid_from!: Date;

  @ApiProperty({ example: null, nullable: true })
  valid_to!: Date | null;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  created_at!: Date;

  @ApiProperty({ example: null, nullable: true })
  updated_at!: Date | null;
}

export function ApiFindMyProjects() {
  return applyDecorators(
    Get(),
    UseGuards(JwtGuard),
    ApiOAuth2([]),
    ApiOperation({ summary: "Get the current user's projects" }),
    ApiQuery({
      name: 'hasApiKey',
      required: false,
      type: Boolean,
      description:
        'Optional filter: true for projects with an active API key, false for projects without one',
    }),
    ApiQuery({
      name: 'field',
      required: false,
      enum: ProjectSortField,
      description: 'Optional sort field for the project list',
    }),
    ApiQuery({
      name: 'sort',
      required: false,
      enum: ProjectSortDirection,
      description: 'Optional sort direction for the project list',
    }),
    ApiResponse({
      status: 200,
      description: 'Projects found',
      type: [ProjectResponse],
    }),
  );
}

export function ApiGetProject() {
  return applyDecorators(
    Get(':id'),
    UseGuards(JwtGuard, ProjectOwnershipGuard),
    ApiOAuth2([]),
    ApiOperation({ summary: 'Get a project by ID' }),
    ApiParam({ name: 'id', type: 'string', format: 'uuid' }),
    ApiResponse({
      status: 200,
      description: 'Project found',
      type: ProjectResponse,
    }),
    ApiResponse({ status: 404, description: 'Project not found' }),
  );
}

export function ApiCheckProjectApiKey() {
  return applyDecorators(
    Get(':id/has-api-key'),
    UseGuards(JwtGuard, ProjectOwnershipGuard),
    ApiOAuth2([]),
    ApiOperation({
      summary: 'Check if a project has a valid (non-revoked) API key',
    }),
    ApiParam({ name: 'id', type: 'string', format: 'uuid' }),
    ApiResponse({ status: 200, description: 'Active API key status' }),
  );
}

export function ApiFindProjectByApiKey() {
  return applyDecorators(
    Get('by-api-key'),
    UseGuards(JwtGuard),
    ApiOAuth2([]),
    ApiOperation({ summary: 'Get the project that owns a given API key' }),
    ApiQuery({
      name: 'apiKeyId',
      required: true,
      schema: { type: 'string', format: 'uuid' },
    }),
    ApiResponse({
      status: 200,
      description: 'Project found',
      type: ProjectResponse,
    }),
    ApiResponse({ status: 404, description: 'API key not found' }),
  );
}

export function ApiCreateProject() {
  return applyDecorators(
    Post(),
    UseGuards(JwtGuard),
    ApiOAuth2([]),
    ApiOperation({ summary: 'Create a new project' }),
    ApiResponse({
      status: 201,
      description: 'Project created',
      type: ProjectResponse,
    }),
    ApiResponse({ status: 400, description: 'Invalid input' }),
  );
}

export function ApiUpdateProject() {
  return applyDecorators(
    Patch(':id'),
    UseGuards(JwtGuard, ProjectOwnershipGuard),
    ApiOAuth2([]),
    ApiOperation({ summary: 'Update a project' }),
    ApiParam({ name: 'id', type: 'string', format: 'uuid' }),
    ApiResponse({
      status: 200,
      description: 'Project updated',
      type: ProjectResponse,
    }),
    ApiResponse({ status: 404, description: 'Project not found' }),
  );
}

export function ApiDeleteProject() {
  return applyDecorators(
    Delete(':id'),
    UseGuards(JwtGuard, ProjectOwnershipGuard),
    HttpCode(204),
    ApiOAuth2([]),
    ApiOperation({ summary: 'Delete (soft-delete) a project' }),
    ApiParam({ name: 'id', type: 'string', format: 'uuid' }),
    ApiResponse({ status: 204, description: 'Project deleted' }),
    ApiResponse({ status: 404, description: 'Project not found' }),
  );
}

export function ApiAddApiKeyToProject() {
  return applyDecorators(
    Post(':id/api-key'),
    UseGuards(JwtGuard, ProjectOwnershipGuard),
    ApiOAuth2([]),
    ApiOperation({
      summary: 'Create a new API key for the project (max 3 active per user)',
    }),
    ApiParam({ name: 'id', type: 'string', format: 'uuid' }),
    ApiResponse({ status: 201, description: 'API key created' }),
  );
}

export function ApiListProjectMembers() {
  return applyDecorators(
    Get(':id/members'),
    UseGuards(JwtGuard, ProjectOwnershipGuard),
    ApiOAuth2([]),
    ApiOperation({ summary: 'List project members' }),
    ApiParam({ name: 'id', type: 'string', format: 'uuid' }),
    ApiResponse({
      status: 200,
      description: 'Project members found',
      type: [ProjectMemberResponse],
    }),
  );
}

export function ApiAddProjectMember() {
  return applyDecorators(
    Post(':id/members'),
    UseGuards(JwtGuard, ProjectOwnershipGuard),
    ApiOAuth2([]),
    ApiOperation({ summary: 'Add a user to a project' }),
    ApiParam({ name: 'id', type: 'string', format: 'uuid' }),
    ApiResponse({
      status: 201,
      description: 'Project member added',
      type: ProjectMemberResponse,
    }),
  );
}

export function ApiUpdateProjectMember() {
  return applyDecorators(
    Patch(':id/members/:userId'),
    UseGuards(JwtGuard, ProjectOwnershipGuard),
    ApiOAuth2([]),
    ApiOperation({ summary: 'Update a project member role' }),
    ApiParam({ name: 'id', type: 'string', format: 'uuid' }),
    ApiParam({ name: 'userId', type: 'string', format: 'uuid' }),
    ApiResponse({
      status: 200,
      description: 'Project member updated',
      type: ProjectMemberResponse,
    }),
  );
}

export function ApiRemoveProjectMember() {
  return applyDecorators(
    Delete(':id/members/:userId'),
    UseGuards(JwtGuard, ProjectOwnershipGuard),
    HttpCode(204),
    ApiOAuth2([]),
    ApiOperation({ summary: 'Remove a project member' }),
    ApiParam({ name: 'id', type: 'string', format: 'uuid' }),
    ApiParam({ name: 'userId', type: 'string', format: 'uuid' }),
    ApiResponse({ status: 204, description: 'Project member removed' }),
  );
}

export function ApiGetProjectPerformanceSettings() {
  return applyDecorators(
    Get(':id/settings/performance'),
    UseGuards(JwtGuard, ProjectOwnershipGuard),
    ApiOAuth2([]),
    ApiOperation({ summary: 'Get project performance settings' }),
    ApiParam({ name: 'id', type: 'string', format: 'uuid' }),
    ApiResponse({
      status: 200,
      description: 'Project performance settings found',
      type: PerformanceSettingsResponse,
    }),
  );
}

export function ApiReplaceProjectPerformanceSettings() {
  return applyDecorators(
    Put(':id/settings/performance'),
    UseGuards(JwtGuard, ProjectOwnershipGuard),
    ApiOAuth2([]),
    ApiOperation({ summary: 'Replace project performance settings' }),
    ApiParam({ name: 'id', type: 'string', format: 'uuid' }),
    ApiResponse({
      status: 200,
      description: 'Project performance settings replaced',
      type: PerformanceSettingsResponse,
    }),
  );
}

export function ApiUpdateProjectPerformanceSettings() {
  return applyDecorators(
    Patch(':id/settings/performance'),
    UseGuards(JwtGuard, ProjectOwnershipGuard),
    ApiOAuth2([]),
    ApiOperation({ summary: 'Update project performance settings' }),
    ApiParam({ name: 'id', type: 'string', format: 'uuid' }),
    ApiResponse({
      status: 200,
      description: 'Project performance settings updated',
      type: PerformanceSettingsResponse,
    }),
  );
}

export function ApiDeleteProjectPerformanceSettings() {
  return applyDecorators(
    Delete(':id/settings/performance'),
    UseGuards(JwtGuard, ProjectOwnershipGuard),
    HttpCode(204),
    ApiOAuth2([]),
    ApiOperation({ summary: 'Reset project performance settings' }),
    ApiParam({ name: 'id', type: 'string', format: 'uuid' }),
    ApiResponse({
      status: 204,
      description: 'Project performance settings reset',
    }),
  );
}

export function ApiGetProjectCommunicationSettings() {
  return applyDecorators(
    Get(':id/settings/communication'),
    UseGuards(JwtGuard, ProjectOwnershipGuard),
    ApiOAuth2([]),
    ApiOperation({ summary: 'Get project communication settings' }),
    ApiParam({ name: 'id', type: 'string', format: 'uuid' }),
    ApiResponse({
      status: 200,
      description: 'Project communication settings found',
      type: CommunicationSettingsResponse,
    }),
  );
}

export function ApiReplaceProjectCommunicationSettings() {
  return applyDecorators(
    Put(':id/settings/communication'),
    UseGuards(JwtGuard, ProjectOwnershipGuard),
    ApiOAuth2([]),
    ApiOperation({ summary: 'Replace project communication settings' }),
    ApiParam({ name: 'id', type: 'string', format: 'uuid' }),
    ApiResponse({
      status: 200,
      description: 'Project communication settings replaced',
      type: CommunicationSettingsResponse,
    }),
  );
}

export function ApiUpdateProjectCommunicationSettings() {
  return applyDecorators(
    Patch(':id/settings/communication'),
    UseGuards(JwtGuard, ProjectOwnershipGuard),
    ApiOAuth2([]),
    ApiOperation({ summary: 'Update project communication settings' }),
    ApiParam({ name: 'id', type: 'string', format: 'uuid' }),
    ApiResponse({
      status: 200,
      description: 'Project communication settings updated',
      type: CommunicationSettingsResponse,
    }),
  );
}

export function ApiDeleteProjectCommunicationSettings() {
  return applyDecorators(
    Delete(':id/settings/communication'),
    UseGuards(JwtGuard, ProjectOwnershipGuard),
    HttpCode(204),
    ApiOAuth2([]),
    ApiOperation({ summary: 'Reset project communication settings' }),
    ApiParam({ name: 'id', type: 'string', format: 'uuid' }),
    ApiResponse({
      status: 204,
      description: 'Project communication settings reset',
    }),
  );
}

export function ApiGetProjectRegionSettings() {
  return applyDecorators(
    Get(':id/settings/region-localization'),
    UseGuards(JwtGuard, ProjectOwnershipGuard),
    ApiOAuth2([]),
    ApiOperation({ summary: 'Get project region and localization settings' }),
    ApiParam({ name: 'id', type: 'string', format: 'uuid' }),
    ApiResponse({
      status: 200,
      description: 'Project region settings found',
      type: ProjectRegionSettingsResponse,
    }),
  );
}

export function ApiUpdateProjectRegionSettings() {
  return applyDecorators(
    Patch(':id/settings/region-localization'),
    UseGuards(JwtGuard, ProjectOwnershipGuard),
    ApiOAuth2([]),
    ApiOperation({
      summary: 'Update project region and localization settings',
    }),
    ApiParam({ name: 'id', type: 'string', format: 'uuid' }),
    ApiResponse({
      status: 200,
      description: 'Project region settings updated',
      type: ProjectRegionSettingsResponse,
    }),
  );
}

export function ApiDeleteProjectRegionSettings() {
  return applyDecorators(
    Delete(':id/settings/region-localization'),
    UseGuards(JwtGuard, ProjectOwnershipGuard),
    HttpCode(204),
    ApiOAuth2([]),
    ApiOperation({ summary: 'Reset project region and localization settings' }),
    ApiParam({ name: 'id', type: 'string', format: 'uuid' }),
    ApiResponse({
      status: 204,
      description: 'Project region settings reset',
    }),
  );
}
