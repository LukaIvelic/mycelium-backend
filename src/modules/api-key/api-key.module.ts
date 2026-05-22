import { Module } from '@nestjs/common';
import { JwtAuthModule } from '@/common/auth/jwt-auth.module';
import { BloomService } from '@/common/cache/bloom.service';
import { CacheModule } from '@/common/cache/cache.module';
import { ApiKeyGuard } from '@/common/guards/api-key.guard';
import { ApiKeyController } from './api-key.controller';
import { ApiKeyRepository } from './api-key.repository';
import { ApiKeyService } from './api-key.service';
import { ApiKeyRateLimiterService } from './api-key-rate-limiter.service';

const bloomService = {
  provide: BloomService,
  inject: [ApiKeyRepository],
  useFactory: (apiKeyRepository: ApiKeyRepository) =>
    new BloomService(() => apiKeyRepository.findAllActiveHashes()),
};

@Module({
  imports: [JwtAuthModule, CacheModule],
  controllers: [ApiKeyController],
  providers: [
    ApiKeyService,
    ApiKeyRepository,
    bloomService,
    ApiKeyRateLimiterService,
    ApiKeyGuard,
  ],
  exports: [ApiKeyService, ApiKeyGuard, ApiKeyRateLimiterService],
})
export class ApiKeyModule {}
