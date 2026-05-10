import {
  applyDecorators,
  Delete,
  Get,
  HttpCode,
  UseGuards,
} from '@nestjs/common';
import {
  ApiOAuth2,
  ApiOperation,
  ApiParam,
  ApiProperty,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtGuard } from '@/common/guards/jwt.guard';

export class ApiKeyResponse {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: 'My API Key' })
  name: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  project_id: string;

  @ApiProperty({ example: 'abc12345' })
  key_prefix: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  valid_from: Date;

  @ApiProperty({ example: null, nullable: true })
  valid_to: Date | null;

  @ApiProperty({ example: null, nullable: true })
  revoked_at: Date | null;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  created_at: Date;
}

export function ApiFindMyApiKeys() {
  return applyDecorators(
    Get(),
    UseGuards(JwtGuard),
    ApiOAuth2([]),
    ApiOperation({
      summary: 'Get all API keys for the current user (across their projects)',
    }),
    ApiResponse({
      status: 200,
      description: 'API keys found',
      type: [ApiKeyResponse],
    }),
  );
}

export function ApiRevokeApiKey() {
  return applyDecorators(
    Delete(':id'),
    UseGuards(JwtGuard),
    HttpCode(204),
    ApiOAuth2([]),
    ApiOperation({ summary: 'Revoke an API key' }),
    ApiParam({ name: 'id', type: 'string', format: 'uuid' }),
    ApiResponse({ status: 204, description: 'API key revoked' }),
    ApiResponse({ status: 403, description: 'Not the owner of the API key' }),
    ApiResponse({ status: 404, description: 'API key not found' }),
  );
}
