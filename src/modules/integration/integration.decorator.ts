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
  ApiSecurity,
} from '@nestjs/swagger';
import { ApiKeyGuard } from '@/common/guards/api-key.guard';
import { JwtGuard } from '@/common/guards/jwt.guard';
import {
  CommunicationSettingsResponse,
  PerformanceSettingsResponse,
  RuntimeSettingsResponse,
} from '../settings/settings.dto';

export class IntegrationResponse {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id!: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  projectId!: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  apiKeyId!: string;

  @ApiProperty({ example: 'http://localhost:3003' })
  origin!: string;

  @ApiProperty({ example: 'http://localhost:3003' })
  normalizedOrigin!: string;

  @ApiProperty({ example: 'orders-api', nullable: true })
  key!: string | null;

  @ApiProperty({ example: 'Orders API', nullable: true })
  name!: string | null;

  @ApiProperty({ example: '1.2.0', nullable: true })
  version!: string | null;

  @ApiProperty({ example: null, nullable: true })
  description!: string | null;

  @ApiProperty({ example: null, nullable: true })
  repository!: string | null;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  updatedAt!: Date;
}

export function ApiListIntegrations() {
  return applyDecorators(
    Get(),
    UseGuards(JwtGuard),
    ApiOAuth2([]),
    ApiOperation({ summary: 'List integrations for a project' }),
    ApiQuery({
      name: 'projectId',
      required: true,
      schema: { type: 'string', format: 'uuid' },
    }),
    ApiResponse({
      status: 200,
      description: 'Integrations found',
      type: [IntegrationResponse],
    }),
  );
}

export function ApiGetIntegrationRuntimeSettings() {
  return applyDecorators(
    Get('runtime-settings'),
    UseGuards(ApiKeyGuard),
    ApiSecurity('x-api-key'),
    ApiOperation({
      summary: 'Resolve SDK runtime settings for a service origin',
    }),
    ApiQuery({ name: 'origin', required: true, type: String }),
    ApiQuery({ name: 'key', required: false, type: String }),
    ApiResponse({
      status: 200,
      description: 'Runtime settings resolved',
      type: RuntimeSettingsResponse,
    }),
    ApiResponse({ status: 401, description: 'Missing or invalid API key' }),
  );
}

export function ApiCreateIntegration() {
  return applyDecorators(
    Post(),
    UseGuards(JwtGuard),
    ApiOAuth2([]),
    ApiOperation({ summary: 'Create an integration' }),
    ApiResponse({
      status: 201,
      description: 'Integration created',
      type: IntegrationResponse,
    }),
    ApiResponse({ status: 400, description: 'Invalid input' }),
    ApiResponse({ status: 409, description: 'Integration origin conflict' }),
  );
}

export function ApiGetIntegration() {
  return applyDecorators(
    Get(':integrationId'),
    UseGuards(JwtGuard),
    ApiOAuth2([]),
    ApiOperation({ summary: 'Get an integration by ID' }),
    ApiParam({ name: 'integrationId', type: 'string', format: 'uuid' }),
    ApiResponse({
      status: 200,
      description: 'Integration found',
      type: IntegrationResponse,
    }),
    ApiResponse({ status: 404, description: 'Integration not found' }),
  );
}

export function ApiUpdateIntegration() {
  return applyDecorators(
    Patch(':integrationId'),
    UseGuards(JwtGuard),
    ApiOAuth2([]),
    ApiOperation({ summary: 'Update an integration' }),
    ApiParam({ name: 'integrationId', type: 'string', format: 'uuid' }),
    ApiResponse({
      status: 200,
      description: 'Integration updated',
      type: IntegrationResponse,
    }),
    ApiResponse({ status: 404, description: 'Integration not found' }),
    ApiResponse({ status: 409, description: 'Integration origin conflict' }),
  );
}

export function ApiDeleteIntegration() {
  return applyDecorators(
    Delete(':integrationId'),
    UseGuards(JwtGuard),
    HttpCode(204),
    ApiOAuth2([]),
    ApiOperation({ summary: 'Delete an integration' }),
    ApiParam({ name: 'integrationId', type: 'string', format: 'uuid' }),
    ApiResponse({ status: 204, description: 'Integration deleted' }),
    ApiResponse({ status: 404, description: 'Integration not found' }),
  );
}

export function ApiGetIntegrationPerformanceSettings() {
  return applyDecorators(
    Get(':integrationId/settings/performance'),
    UseGuards(JwtGuard),
    ApiOAuth2([]),
    ApiOperation({ summary: 'Get integration performance settings' }),
    ApiParam({ name: 'integrationId', type: 'string', format: 'uuid' }),
    ApiResponse({
      status: 200,
      description: 'Integration performance settings found',
      type: PerformanceSettingsResponse,
    }),
  );
}

export function ApiReplaceIntegrationPerformanceSettings() {
  return applyDecorators(
    Put(':integrationId/settings/performance'),
    UseGuards(JwtGuard),
    ApiOAuth2([]),
    ApiOperation({ summary: 'Replace integration performance settings' }),
    ApiParam({ name: 'integrationId', type: 'string', format: 'uuid' }),
    ApiResponse({
      status: 200,
      description: 'Integration performance settings replaced',
      type: PerformanceSettingsResponse,
    }),
  );
}

export function ApiUpdateIntegrationPerformanceSettings() {
  return applyDecorators(
    Patch(':integrationId/settings/performance'),
    UseGuards(JwtGuard),
    ApiOAuth2([]),
    ApiOperation({ summary: 'Update integration performance settings' }),
    ApiParam({ name: 'integrationId', type: 'string', format: 'uuid' }),
    ApiResponse({
      status: 200,
      description: 'Integration performance settings updated',
      type: PerformanceSettingsResponse,
    }),
  );
}

export function ApiDeleteIntegrationPerformanceSettings() {
  return applyDecorators(
    Delete(':integrationId/settings/performance'),
    UseGuards(JwtGuard),
    HttpCode(204),
    ApiOAuth2([]),
    ApiOperation({ summary: 'Reset integration performance settings' }),
    ApiParam({ name: 'integrationId', type: 'string', format: 'uuid' }),
    ApiResponse({
      status: 204,
      description: 'Integration performance settings reset',
    }),
  );
}

export function ApiGetIntegrationCommunicationSettings() {
  return applyDecorators(
    Get(':integrationId/settings/communication'),
    UseGuards(JwtGuard),
    ApiOAuth2([]),
    ApiOperation({ summary: 'Get integration communication settings' }),
    ApiParam({ name: 'integrationId', type: 'string', format: 'uuid' }),
    ApiResponse({
      status: 200,
      description: 'Integration communication settings found',
      type: CommunicationSettingsResponse,
    }),
  );
}

export function ApiReplaceIntegrationCommunicationSettings() {
  return applyDecorators(
    Put(':integrationId/settings/communication'),
    UseGuards(JwtGuard),
    ApiOAuth2([]),
    ApiOperation({ summary: 'Replace integration communication settings' }),
    ApiParam({ name: 'integrationId', type: 'string', format: 'uuid' }),
    ApiResponse({
      status: 200,
      description: 'Integration communication settings replaced',
      type: CommunicationSettingsResponse,
    }),
  );
}

export function ApiUpdateIntegrationCommunicationSettings() {
  return applyDecorators(
    Patch(':integrationId/settings/communication'),
    UseGuards(JwtGuard),
    ApiOAuth2([]),
    ApiOperation({ summary: 'Update integration communication settings' }),
    ApiParam({ name: 'integrationId', type: 'string', format: 'uuid' }),
    ApiResponse({
      status: 200,
      description: 'Integration communication settings updated',
      type: CommunicationSettingsResponse,
    }),
  );
}

export function ApiDeleteIntegrationCommunicationSettings() {
  return applyDecorators(
    Delete(':integrationId/settings/communication'),
    UseGuards(JwtGuard),
    HttpCode(204),
    ApiOAuth2([]),
    ApiOperation({ summary: 'Reset integration communication settings' }),
    ApiParam({ name: 'integrationId', type: 'string', format: 'uuid' }),
    ApiResponse({
      status: 204,
      description: 'Integration communication settings reset',
    }),
  );
}
