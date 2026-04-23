import {
  Body,
  Controller,
  Get,
  Logger,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiOAuth2, ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { LogService } from './log.service';
import { CreateLogDto, ListLogsQueryDto } from './log.dto';
import { Log } from './log.entity';
import { LogDetail } from './log-detail.entity';
import { ApiKeyGuard } from '../api-key/api-key.guard';
import { JwtGuard } from '../auth/jwt.guard';
import { ProjectService } from '../project/project.service';
import { ApiKey } from '../api-key/entities/api_key.entity';

@ApiTags('logs')
@Controller('logs')
export class LogController {
  constructor(
    private readonly logService: LogService,
    private readonly projectService: ProjectService,
  ) {}

  @Post()
  @UseGuards(ApiKeyGuard)
  @ApiSecurity('x-api-key')
  @ApiOperation({
    summary: 'Push a new log entry (authenticated via x-api-key header)',
  })
  async create(
    @Body() dto: CreateLogDto,
    @Req() request: Request,
  ): Promise<Log> {
    const apiKey = request['apiKey'] as ApiKey;
    return this.logService.create(apiKey.project_id, apiKey.id, dto);
  }

  @Get(':projectId')
  @UseGuards(JwtGuard)
  @ApiOAuth2([])
  @ApiOperation({ summary: 'List logs for a project (owned by the caller)' })
  async findByProject(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query() query: ListLogsQueryDto,
    @Req() request: Request,
  ): Promise<Log[]> {
    const { sub } = request['user'] as { sub: string };
    await this.projectService.assertUserOwnsProject(projectId, sub);
    return this.logService.findByProjectId(
      projectId,
      query.limit ?? 100,
      query.offset ?? 0,
    );
  }

  @Get(':projectId/:logId/detail')
  @UseGuards(JwtGuard)
  @ApiOAuth2([])
  @ApiOperation({
    summary: 'Get details (body, headers, flags) for a single log',
  })
  async findDetail(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('logId', ParseUUIDPipe) logId: string,
    @Req() request: Request,
  ): Promise<LogDetail> {
    const { sub } = request['user'] as { sub: string };
    await this.projectService.assertUserOwnsProject(projectId, sub);
    return this.logService.findDetail(projectId, logId);
  }
}
