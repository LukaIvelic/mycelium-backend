import {
  Controller,
  Post,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiOperation, ApiSecurity } from '@nestjs/swagger';
import { ApiKeyService } from './api-key.service';
import { JwtGuard } from '../auth/jwt.guard';

@Controller('api-keys')
@UseGuards(JwtGuard)
@ApiSecurity('oauth2')
export class ApiKeyController {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get all API keys for a user (across all their projects)' })
  async findByUserId(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.apiKeyService.findByUserId(userId);
  }

  @Get(':id/project')
  @ApiOperation({ summary: 'Get the project that owns a given API key' })
  async getProjectByApiKey(@Param('id', ParseUUIDPipe) id: string) {
    return this.apiKeyService.getProjectByApiKeyId(id);
  }

  @Post(':projectId')
  async create(@Param('projectId', ParseUUIDPipe) projectId: string) {
    return this.apiKeyService.createApiKey(projectId);
  }

  @Delete(':projectId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revoke(@Param('projectId', ParseUUIDPipe) projectId: string) {
    await this.apiKeyService.revokeApiKey(projectId);
  }
}
