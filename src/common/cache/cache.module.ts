import { Module } from '@nestjs/common';
import { LocalCacheService } from './local-cache.service';
import { RedisCacheService } from './redis-cache.service';

@Module({
  providers: [LocalCacheService, RedisCacheService],
  exports: [LocalCacheService, RedisCacheService],
})
export class CacheModule {}
