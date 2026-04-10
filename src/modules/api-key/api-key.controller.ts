import {
  Controller,
  Post,
  Delete,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import type { Request } from 'express';
import { ApiKeyService } from './api-key.service';
import { JwtGuard } from '../auth/jwt.guard';

@Controller('api-keys')
@UseGuards(JwtGuard)
@ApiBearerAuth()
export class ApiKeyController {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  @Post()
  async create(@Req() req: Request) {
    const userId = req['user'].sub as string;
    return this.apiKeyService.createApiKey(userId);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  async revoke(@Req() req: Request) {
    const userId = req['user'].sub as string;
    await this.apiKeyService.revokeApiKey(userId);
  }
}
