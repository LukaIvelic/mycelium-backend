import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRedis } from '@nestjs-modules/ioredis';
import type { Redis } from 'ioredis';
import { RateLimiterService } from '@/common/rate-limit/rate-limiter.service';
import {
  ASSISTANT_DEFAULT_RATE_LIMIT_MAX_REQUESTS,
  ASSISTANT_DEFAULT_RATE_LIMIT_WINDOW_SECONDS,
  parsePositiveInteger,
} from './assistant.config';

@Injectable()
export class AssistantRateLimiterService extends RateLimiterService {
  constructor(@InjectRedis() redis: Redis, config: ConfigService) {
    super(redis, {
      prefix: 'ratelimit:assistant:',
      windowSeconds: parsePositiveInteger(
        config.get<string>('ASSISTANT_RATE_LIMIT_WINDOW_SECONDS'),
        ASSISTANT_DEFAULT_RATE_LIMIT_WINDOW_SECONDS,
      ),
      maxRequests: parsePositiveInteger(
        config.get<string>('ASSISTANT_RATE_LIMIT_MAX_REQUESTS'),
        ASSISTANT_DEFAULT_RATE_LIMIT_MAX_REQUESTS,
      ),
    });
  }
}
