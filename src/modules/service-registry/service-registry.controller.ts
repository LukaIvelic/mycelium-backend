import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { ApiKeyGuard } from '../api-key/api-key.guard';
import { ApiKey } from '../api-key/entities/api_key.entity';
import { RegisteredService } from './registered-service.entity';
import { RegisterServiceDto } from './service-registry.dto';
import { ServiceRegistryService } from './service-registry.service';

@ApiTags('services')
@Controller('services')
export class ServiceRegistryController {
  constructor(
    private readonly serviceRegistryService: ServiceRegistryService,
  ) {}

  @Post('register')
  @UseGuards(ApiKeyGuard)
  @ApiSecurity('x-api-key')
  @ApiOperation({ summary: 'Register a service origin for a project' })
  async register(
    @Body() dto: RegisterServiceDto,
    @Req() request: Request,
  ): Promise<RegisteredService> {
    const apiKey = request['apiKey'] as ApiKey;
    return this.serviceRegistryService.register(
      apiKey.project_id,
      apiKey.id,
      dto,
    );
  }
}
