import { Module } from '@nestjs/common';
import { isNull } from 'drizzle-orm';
import { JwtAuthModule } from '@/common/auth/jwt-auth.module';
import { BloomService } from '@/common/cache/bloom.service';
import { CacheModule } from '@/common/cache/cache.module';
import { ApiKeyGuard } from '@/common/guards/api-key.guard';
import { apiKeys } from '@/database';
import { DRIZZLE } from '@/database/database.module';
import type { Database } from '@/database/database.types';
import { ApiKeyController } from './api-key.controller';
import { ApiKeyService } from './api-key.service';
import { ApiKeyRateLimiterService } from './api-key-rate-limiter.service';

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
  imports: [JwtAuthModule, CacheModule],
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
