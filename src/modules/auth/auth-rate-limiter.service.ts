import { Injectable } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { Redis } from 'ioredis';
import { RateLimiterService } from '@/common/rate-limit/rate-limiter.service';

@Injectable()
export class AuthRateLimiterService extends RateLimiterService {
  constructor(@InjectRedis() redis: Redis) {
    super(redis, {
      prefix: 'ratelimit:validate-user:',
      windowSeconds: 60,
      maxRequests: 10,
    });
  }
}
