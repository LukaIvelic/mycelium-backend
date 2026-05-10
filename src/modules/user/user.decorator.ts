import {
  applyDecorators,
  Delete,
  Get,
  HttpCode,
  Patch,
  Post,
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

export class UserResponse {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: 'John' })
  first_name: string;

  @ApiProperty({ example: 'Doe' })
  last_name: string;

  @ApiProperty({ example: 'john.doe@example.com' })
  email: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  valid_from: Date;

  @ApiProperty({ example: null, nullable: true })
  valid_to: Date | null;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  created_at: Date;

  @ApiProperty({ example: null, nullable: true })
  updated_at: Date | null;
}

export function ApiFindMe() {
  return applyDecorators(
    Get('me'),
    UseGuards(JwtGuard),
    ApiOAuth2([]),
    ApiOperation({ summary: 'Get the currently authenticated user' }),
  );
}

export function ApiGetUser() {
  return applyDecorators(
    Get(':id'),
    UseGuards(JwtGuard),
    ApiOAuth2([]),
    ApiOperation({ summary: 'Get a user by ID' }),
    ApiParam({ name: 'id', type: 'string', format: 'uuid' }),
    ApiResponse({ status: 200, description: 'User found', type: UserResponse }),
    ApiResponse({ status: 404, description: 'User not found' }),
  );
}

export function ApiCreateUser() {
  return applyDecorators(
    Post(),
    ApiOperation({ summary: 'Create a new user' }),
    ApiResponse({
      status: 201,
      description: 'User created',
      type: UserResponse,
    }),
    ApiResponse({ status: 400, description: 'Invalid input' }),
  );
}

export function ApiUpdateUser() {
  return applyDecorators(
    Patch(':id'),
    UseGuards(JwtGuard),
    ApiOAuth2([]),
    ApiOperation({ summary: 'Update a user' }),
    ApiParam({ name: 'id', type: 'string', format: 'uuid' }),
    ApiResponse({
      status: 200,
      description: 'User updated',
      type: UserResponse,
    }),
    ApiResponse({ status: 404, description: 'User not found' }),
  );
}

export function ApiDeleteUser() {
  return applyDecorators(
    Delete(':id'),
    UseGuards(JwtGuard),
    HttpCode(204),
    ApiOAuth2([]),
    ApiOperation({ summary: 'Delete (soft-delete) a user' }),
    ApiParam({ name: 'id', type: 'string', format: 'uuid' }),
    ApiResponse({ status: 204, description: 'User deleted' }),
    ApiResponse({ status: 404, description: 'User not found' }),
  );
}
