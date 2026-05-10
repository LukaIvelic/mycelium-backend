import { Controller, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiKeyService } from './api-key.service';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { ApiFindMyApiKeys, ApiRevokeApiKey } from './api-key.decorator';

@ApiTags('api-keys')
@Controller('api-keys')
export class ApiKeyController {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  @ApiFindMyApiKeys()
  findMine(@CurrentUser() userId: string) {
    return this.apiKeyService.findByUserId(userId);
  }

  @ApiRevokeApiKey()
  async revoke(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() userId: string,
  ): Promise<void> {
    await this.apiKeyService.revokeApiKey(id, userId);
  }
}
