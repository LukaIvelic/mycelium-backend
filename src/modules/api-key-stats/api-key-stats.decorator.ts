import { applyDecorators, Get, UseGuards } from '@nestjs/common';
import {
  ApiOAuth2,
  ApiOperation,
  ApiParam,
  ApiProperty,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtGuard } from '@/common/guards/jwt.guard';

export class ApiKeyIpStatsResponse {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  apiKeyId!: string;

  @ApiProperty({ example: '203.0.113.10' })
  ip!: string;

  @ApiProperty({ example: '2026-05-19T10:00:00.000Z' })
  firstSeen!: Date;

  @ApiProperty({ example: '2026-05-19T10:05:00.000Z' })
  lastSeen!: Date;

  @ApiProperty({ example: 12 })
  requestCount!: number;

  @ApiProperty({ example: 'HR' })
  country!: string;
}

export class ApiKeyStatsResponse {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  apiKeyId!: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  projectId!: string;

  @ApiProperty({ example: 128 })
  totalRequests!: number;

  @ApiProperty({ example: 42 })
  averageLatencyMs!: number;

  @ApiProperty({ type: [ApiKeyIpStatsResponse] })
  ipStats!: ApiKeyIpStatsResponse[];
}

export function ApiGetApiKeyStats() {
  return applyDecorators(
    Get(':apiKeyId'),
    UseGuards(JwtGuard),
    ApiOAuth2([]),
    ApiOperation({ summary: 'Get usage stats for an API key' }),
    ApiParam({ name: 'apiKeyId', type: 'string', format: 'uuid' }),
    ApiResponse({
      status: 200,
      description: 'API key stats found',
      type: ApiKeyStatsResponse,
    }),
    ApiResponse({ status: 403, description: 'Not the owner of the API key' }),
    ApiResponse({ status: 404, description: 'API key not found' }),
  );
}
