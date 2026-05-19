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

  @ApiProperty({ example: 'Croatia' })
  country!: string;

  @ApiProperty({
    nullable: true,
    example: {
      query: '188.252.186.113',
      status: 'success',
      country: 'Croatia',
      countryCode: 'HR',
      region: '21',
      regionName: 'City of Zagreb',
      city: 'Zagreb',
      zip: '10000',
      lat: 45.8293,
      lon: 15.9793,
      timezone: 'Europe/Zagreb',
      isp: 'XNET',
      org: '',
      as: 'AS31012 A1 Hrvatska d.o.o.',
    },
  })
  detailed!: unknown | null;
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
