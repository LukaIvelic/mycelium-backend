import { applyDecorators, Get, Post, UseGuards } from '@nestjs/common';
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

export class LogResponse {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id!: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  projectId!: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  apiKeyId!: string;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    nullable: true,
  })
  integrationId!: string | null;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    nullable: true,
  })
  callerIntegrationId!: string | null;

  @ApiProperty({ example: 'a1b2c3d4e5f6...' })
  traceId!: string;

  @ApiProperty({ example: 'abcdef0123456789' })
  spanId!: string;

  @ApiProperty({ example: null, nullable: true })
  parentSpanId!: string | null;

  @ApiProperty({ example: 'orders-api', nullable: true })
  integrationKey!: string | null;

  @ApiProperty({ example: 'Orders API', nullable: true })
  integrationName!: string | null;

  @ApiProperty({ example: '1.2.0', nullable: true })
  integrationVersion!: string | null;

  @ApiProperty({ example: null, nullable: true })
  integrationDescription!: string | null;

  @ApiProperty({ example: 'http://localhost:3003', nullable: true })
  integrationOrigin!: string | null;

  @ApiProperty({ example: 'GET' })
  method!: string;

  @ApiProperty({ example: '/api/users' })
  path!: string;

  @ApiProperty({ example: 'https://example.com' })
  origin!: string;

  @ApiProperty({ example: 'https' })
  protocol!: string;

  @ApiProperty({ example: 200 })
  statusCode!: number;

  @ApiProperty({ example: 42 })
  durationMs!: number;

  @ApiProperty({ example: '2026-04-21T10:00:00.000Z' })
  timestamp!: Date;

  @ApiProperty({ example: '2026-04-21T10:00:00.000Z' })
  createdAt!: Date;
}

export function ApiCreateLog() {
  return applyDecorators(
    Post(),
    UseGuards(ApiKeyGuard),
    ApiSecurity('x-api-key'),
    ApiOperation({
      summary: 'Push a new log entry (authenticated via x-api-key header)',
    }),
    ApiResponse({ status: 201, description: 'Log created', type: LogResponse }),
    ApiResponse({ status: 401, description: 'Missing or invalid API key' }),
  );
}

export function ApiListLogs() {
  return applyDecorators(
    Get(),
    UseGuards(JwtGuard),
    ApiOAuth2([]),
    ApiOperation({ summary: 'List logs for a project (owned by the caller)' }),
    ApiQuery({
      name: 'projectId',
      required: true,
      schema: { type: 'string', format: 'uuid' },
    }),
    ApiQuery({
      name: 'limit',
      required: false,
      type: Number,
      description: 'Page size (1-1000)',
    }),
    ApiQuery({
      name: 'offset',
      required: false,
      type: Number,
      description: 'Page offset',
    }),
    ApiResponse({
      status: 200,
      description: 'Logs found',
      type: [LogResponse],
    }),
    ApiResponse({ status: 404, description: 'Project not found' }),
  );
}

export function ApiListLogsByIntegration() {
  return applyDecorators(
    Get('integration/:integrationId'),
    UseGuards(JwtGuard),
    ApiOAuth2([]),
    ApiOperation({
      summary: 'List logs for an integration owned by the caller',
    }),
    ApiParam({ name: 'integrationId', type: 'string', format: 'uuid' }),
    ApiQuery({
      name: 'limit',
      required: false,
      type: Number,
      description: 'Page size (1-1000)',
    }),
    ApiQuery({
      name: 'offset',
      required: false,
      type: Number,
      description: 'Page offset',
    }),
    ApiResponse({
      status: 200,
      description: 'Logs found',
      type: [LogResponse],
    }),
    ApiResponse({ status: 404, description: 'Integration not found' }),
  );
}
