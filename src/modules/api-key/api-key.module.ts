import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiKey } from './entities/api_key.entity';
import { ApiKeyDailyStats } from './entities/api_key_daily_stats.entity';
import { ApiKeyIpStats } from './entities/api_key_ip_stats.entity';
import { ApiKeyService } from './api-key.service';
import { ApiKeyController } from './api-key.controller';
import { ApiKeyBloomService } from './cache/api-key-bloom.service';
import { ApiKeyLocalCacheService } from './cache/api-key-local-cache.service';
import { ApiKeyRedisCacheService } from './cache/api-key-redis.service';
import { ApiKeyRateLimiterService } from './cache/api-key-rate-limiter.service';
import { ApiKeyGuard } from './api-key.guard';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ApiKey, ApiKeyDailyStats, ApiKeyIpStats]),
    AuthModule,
  ],
  controllers: [ApiKeyController],
  providers: [
    ApiKeyService,
    ApiKeyBloomService,
    ApiKeyLocalCacheService,
    ApiKeyRedisCacheService,
    ApiKeyRateLimiterService,
    ApiKeyGuard,
  ],
  exports: [ApiKeyService, ApiKeyGuard],
})
export class ApiKeyModule {}
