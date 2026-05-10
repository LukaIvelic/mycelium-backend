import { Body, Controller, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import type { ApiKey, Log } from '@/database';
import { CurrentApiKey } from '@/modules/api-key/current-api-key.decorator';
import { ApiCreateLog, ApiListLogs } from './log.decorator';
import { CreateLogDto, ListLogsQueryDto } from './log.dto';
import { LogService } from './log.service';

@ApiTags('logs')
@Controller('logs')
export class LogController {
  private readonly limit = 100;
  private readonly offset = 0;

  constructor(private readonly logService: LogService) {}

  @ApiCreateLog()
  create(
    @Body() dto: CreateLogDto,
    @CurrentApiKey() apiKey: ApiKey,
  ): Promise<Log> {
    return this.logService.create(apiKey.projectId, apiKey.id, dto);
  }

  @ApiListLogs()
  findByProject(
    @Query() query: ListLogsQueryDto,
    @CurrentUser() userId: string,
  ): Promise<Log[]> {
    return this.logService.findByProjectId(
      query.projectId,
      userId,
      query.limit ?? this.limit,
      query.offset ?? this.offset,
    );
  }
}
