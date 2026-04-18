import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiOAuth2, ApiOperation, ApiTags } from '@nestjs/swagger';
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
  async findByUserId(@Param('user_id') user_id: string): Promise<Project[]> {
    return this.projectService.findByUserId(user_id);
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

  @Get('active-projects/:user_id')
  @UseGuards(JwtGuard)
  @ApiOAuth2([])
  @ApiOperation({ summary: 'Get all projects with active API keys for a user' })
  async getProjectsWithActiveApiKeys(@Param('user_id', ParseUUIDPipe) id: string): Promise<Project[]> {
    return this.projectService.getProjectsWithActiveApiKeys(id);
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
}
