import { Injectable } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { Redis } from 'ioredis';

const INCREMENT_SCRIPT = `
  local current = redis.call('INCR', KEYS[1])
  if current == 1 then
    redis.call('EXPIRE', KEYS[1], ARGV[1])
  end
  return current
`;

export interface RateLimiterOptions {
  prefix: string;
  windowSeconds: number;
  maxRequests: number;
}

@Injectable()
export class RateLimiterService {
  constructor(
    @InjectRedis() private readonly redis: Redis,
    private readonly options: RateLimiterOptions,
  ) {}

  async isRateLimited(key: string): Promise<boolean> {
    const nowInSeconds = Math.floor(Date.now() / 1000);
    const windowKey = Math.floor(nowInSeconds / this.options.windowSeconds);
    const redisKey = `${this.options.prefix}${key}:${windowKey}`;
    const count = (await this.redis.eval(
      INCREMENT_SCRIPT,
      1,
      redisKey,
      String(this.options.windowSeconds),
    )) as number;
    return count > this.options.maxRequests;
  }
}
