import { applyDecorators, Get, UseGuards } from '@nestjs/common';
import {
  ApiOAuth2,
  ApiOperation,
  ApiParam,
  ApiProperty,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtGuard } from '@/common/guards/jwt.guard';

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
