import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiOAuth2, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ProjectService } from './project.service';
import { AddApiKeyDto, AddApiKeyToProjectResponse, CreateProjectDto, UpdateProjectDto } from './project.dto';
import { Project } from './project.entity';
import { JwtGuard } from '../auth/jwt.guard';

@ApiTags('projects')
@Controller('projects')
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Get()
  async findAll(): Promise<Project[]> {
    return this.projectService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Project> {
    return this.projectService.findOne(id);
  }

  @Get('user/:user_id')
  @ApiQuery({
    name: 'hasApiKey',
    required: false,
    type: Boolean,
    description: 'Optional filter: true for projects with an active API key, false for projects without one',
  })
  async findByUserId(
    @Param('user_id') user_id: string,
    @Query('hasApiKey') hasApiKey?: string,
  ): Promise<Project[]> {
    return this.projectService.findByUserId(
      user_id,
      this.parseHasApiKey(hasApiKey),
    );
  }

  @Post()
  async create(@Body() dto: CreateProjectDto): Promise<Project> {
    return this.projectService.create(dto);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateProjectDto,
  ): Promise<Project> {
    return this.projectService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  async invalidate(@Param('id') id: string): Promise<void> {
    return this.projectService.invalidate(id);
  }

  @Post(':id/api-key')
  @UseGuards(JwtGuard)
  @ApiOAuth2([])
  @ApiOperation({
    summary: 'Create a new API key for the project (max 3 active per user)',
  })
  async addApiKey(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddApiKeyDto,
    @Req() request: Request,
  ): Promise<AddApiKeyToProjectResponse> {
    const { sub } = request['user'] as { sub: string };
    return this.projectService.addApiKeyToProject(id, sub, dto.name);
  }

  private parseHasApiKey(value?: string): boolean | undefined {
    if (value === undefined) return undefined;
    if (value === 'true') return true;
    if (value === 'false') return false;
    throw new BadRequestException('hasApiKey must be true or false');
  }
}
