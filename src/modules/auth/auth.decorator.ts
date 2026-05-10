import { applyDecorators, Get, Post, UseGuards } from '@nestjs/common';
import {
  ApiConsumes,
  ApiExcludeEndpoint,
  ApiOperation,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { TokenDto } from './auth.dto';
import { ValidateUserRateLimitGuard } from '@/modules/auth/auth.guard';

export function ApiSignup() {
  return applyDecorators(
    Post('signup'),
    ApiOperation({ summary: 'Register a new account and receive a JWT' }),
    ApiResponse({ status: 201, type: TokenDto }),
    ApiResponse({ status: 401, description: 'Email already in use' }),
  );
}

export function ApiLogin() {
  return applyDecorators(
    Post('login'),
    ApiOperation({ summary: 'Login and receive a JWT' }),
    ApiResponse({ status: 201, type: TokenDto }),
    ApiResponse({ status: 401, description: 'Invalid credentials' }),
  );
}

export function ApiToken() {
  return applyDecorators(
    Post('token'),
    ApiExcludeEndpoint(),
    ApiConsumes('application/x-www-form-urlencoded'),
  );
}

export function ApiValidateUser() {
  return applyDecorators(
    Get('validate'),
    UseGuards(ValidateUserRateLimitGuard),
    ApiOperation({ summary: 'Check if an email is already registered' }),
    ApiQuery({ name: 'email', type: 'string', format: 'email' }),
    ApiResponse({ status: 200, description: 'Returns { exists: boolean }' }),
    ApiResponse({ status: 429, description: 'Too many requests' }),
  );
}
