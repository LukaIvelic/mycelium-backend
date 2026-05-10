import { Module } from '@nestjs/common';
import { isNull } from 'drizzle-orm';
import { ApiKeyService } from './api-key.service';
import { ApiKeyController } from './api-key.controller';
import { ApiKeyRateLimiterService } from './api-key-rate-limiter.service';
import { BloomService } from '@/common/cache/bloom.service';
import { CacheModule } from '@/common/cache/cache.module';
import { ApiKeyGuard } from '@/common/guards/api-key.guard';
import { DRIZZLE } from '@/database/database.module';
import type { Database } from '@/database/database.types';
import { apiKeys } from '@/database';
import { AuthModule } from '../auth/auth.module';

const bloomService = {
  provide: BloomService,
  inject: [DRIZZLE],
  useFactory: (db: Database) =>
    new BloomService(async () => {
      const rows = await db
        .select({ keyHash: apiKeys.keyHash })
        .from(apiKeys)
        .where(isNull(apiKeys.revokedAt));
      return rows.map((r) => r.keyHash);
    }),
};

@Module({
  imports: [AuthModule, CacheModule],
  controllers: [ApiKeyController],
  providers: [
    ApiKeyService,
    bloomService,
    ApiKeyRateLimiterService,
    ApiKeyGuard,
  ],
  exports: [ApiKeyService, ApiKeyGuard, ApiKeyRateLimiterService],
})
export class ApiKeyModule {}
