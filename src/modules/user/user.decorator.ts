import { applyDecorators } from '@nestjs/common';
import {
  ApiOAuth2,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiProperty,
} from '@nestjs/swagger';

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

export const ApiGetUser = () =>
  applyDecorators(
    ApiOAuth2([]),
    ApiOperation({ summary: 'Get a user by ID' }),
    ApiParam({ name: 'id', type: 'string', format: 'uuid' }),
    ApiResponse({ status: 200, description: 'User found', type: UserResponse }),
    ApiResponse({ status: 404, description: 'User not found' }),
  );

export const ApiCreateUser = () =>
  applyDecorators(
    ApiOperation({ summary: 'Create a new user' }),
    ApiResponse({
      status: 201,
      description: 'User created',
      type: UserResponse,
    }),
    ApiResponse({ status: 400, description: 'Invalid input' }),
  );

export const ApiUpdateUser = () =>
  applyDecorators(
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

export const ApiInvalidateUser = () =>
  applyDecorators(
    ApiOAuth2([]),
    ApiOperation({ summary: 'Invalidate (soft-delete) a user' }),
    ApiParam({ name: 'id', type: 'string', format: 'uuid' }),
    ApiResponse({ status: 204, description: 'User invalidated' }),
    ApiResponse({ status: 404, description: 'User not found' }),
  );
