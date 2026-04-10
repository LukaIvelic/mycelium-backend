import { Injectable } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { Redis } from 'ioredis';

const RATE_LIMIT_PREFIX = 'ratelimit:';
const WINDOW_SECONDS = 1;
const MAX_REQUESTS = 100;

const INCREMENT_SCRIPT = `
  local current = redis.call('INCR', KEYS[1])
  if current == 1 then
    redis.call('EXPIRE', KEYS[1], ARGV[1])
  end
  return current
`;

@Injectable()
export class ApiKeyRateLimiterService {
  constructor(@InjectRedis() private readonly redis: Redis) {}

  async isRateLimited(hash: string): Promise<boolean> {
    const windowKey = Math.floor(Date.now() / 1000);
    const key = `${RATE_LIMIT_PREFIX}${hash}:${windowKey}`;
    const count = await this.redis.eval(
      INCREMENT_SCRIPT,
      1,
      key,
      String(WINDOW_SECONDS),
    ) as number;
    return count > MAX_REQUESTS;
  }
}
