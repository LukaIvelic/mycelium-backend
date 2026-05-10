import { Injectable } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import type { Redis } from 'ioredis';
import { RateLimiterService } from '@/common/rate-limit/rate-limiter.service';

/** Configures rate limiting for API key protected requests. */
@Injectable()
export class ApiKeyRateLimiterService extends RateLimiterService {
  constructor(@InjectRedis() redis: Redis) {
    super(redis, {
      prefix: 'ratelimit:api-key:',
      windowSeconds: 60,
      maxRequests: 60,
    });
  }
}
