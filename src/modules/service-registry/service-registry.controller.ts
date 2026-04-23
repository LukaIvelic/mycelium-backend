import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  ApiOAuth2,
  ApiOperation,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { ApiKeyGuard } from '../api-key/api-key.guard';
import { ApiKey } from '../api-key/entities/api_key.entity';
import { JwtGuard } from '../auth/jwt.guard';
import { ProjectService } from '../project/project.service';
import { RegisteredService } from './registered-service.entity';
import { RegisterServiceDto } from './service-registry.dto';
import { ServiceRegistryService } from './service-registry.service';

@ApiTags('services')
@Controller('services')
export class ServiceRegistryController {
  constructor(
    private readonly serviceRegistryService: ServiceRegistryService,
    private readonly projectService: ProjectService,
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

  @Get(':serviceId')
  @UseGuards(JwtGuard)
  @ApiOAuth2([])
  @ApiOperation({ summary: 'Get a registered service by id' })
  async findById(
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
    @Req() request: Request,
  ): Promise<RegisteredService> {
    const service = await this.serviceRegistryService.findById(serviceId);
    const { sub } = request['user'] as { sub: string };
    await this.projectService.assertUserOwnsProject(service.project_id, sub);
    return service;
  }
}
