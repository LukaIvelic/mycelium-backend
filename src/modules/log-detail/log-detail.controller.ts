import { Controller, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import type { LogDetail } from '@/database';
import { ApiGetLogDetail } from './log-detail.decorator';
import { LogDetailService } from './log-detail.service';

@ApiTags('log-details')
@Controller('log-details')
export class LogDetailController {
  constructor(private readonly logDetailService: LogDetailService) {}

  @ApiGetLogDetail()
  findOne(
    @Param('logId', ParseUUIDPipe) logId: string,
    @CurrentUser() userId: string,
  ): Promise<LogDetail> {
    return this.logDetailService.findOne(logId, userId);
  }
}
