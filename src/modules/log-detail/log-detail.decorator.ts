import { applyDecorators, Get, UseGuards } from '@nestjs/common';
import {
  ApiOAuth2,
  ApiOperation,
  ApiParam,
  ApiProperty,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtGuard } from '@/common/guards/jwt.guard';

export class LogDetailResponse {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  logId: string;

  @ApiProperty({ example: 0.128 })
  bodySizeKb: number;

  @ApiProperty({ example: 128 })
  contentLength: number;

  @ApiProperty({ example: 'application/json' })
  contentType: string;

  @ApiProperty({ example: '{"hello":"world"}', nullable: true })
  body: string | null;

  @ApiProperty({ example: { 'content-type': 'application/json' } })
  headers: unknown;

  @ApiProperty({ example: true })
  completed: boolean;

  @ApiProperty({ example: false })
  aborted: boolean;

  @ApiProperty({ example: true })
  idempotent: boolean;
}

export function ApiGetLogDetail() {
  return applyDecorators(
    Get(':logId'),
    UseGuards(JwtGuard),
    ApiOAuth2([]),
    ApiOperation({
      summary: 'Get details (body, headers, flags) for a single log',
    }),
    ApiParam({ name: 'logId', type: 'string', format: 'uuid' }),
    ApiResponse({
      status: 200,
      description: 'Log detail found',
      type: LogDetailResponse,
    }),
    ApiResponse({ status: 404, description: 'Log or detail not found' }),
  );
}
