import { Controller, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { ApiGetApiKeyStats } from './api-key-stats.decorator';
import type { ApiKeyStatsDto } from './api-key-stats.dto';
import { ApiKeyStatsService } from './api-key-stats.service';

@ApiTags('api-key-stats')
@Controller('api-key-stats')
export class ApiKeyStatsController {
  constructor(private readonly apiKeyStatsService: ApiKeyStatsService) {}

  @ApiGetApiKeyStats()
  findByApiKeyId(
    @Param('apiKeyId', ParseUUIDPipe) apiKeyId: string,
    @CurrentUser() userId: string,
  ): Promise<ApiKeyStatsDto> {
    return this.apiKeyStatsService.findByApiKeyId(apiKeyId, userId);
  }
}
