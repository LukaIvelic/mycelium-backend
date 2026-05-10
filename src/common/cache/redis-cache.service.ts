import { Injectable } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import type { Redis } from 'ioredis';

const NOT_FOUND_SENTINEL = '__NOT_FOUND__';

@Injectable()
export class RedisCacheService<T> {
  constructor(@InjectRedis() private readonly redis: Redis) {}

  async get(hash: string, prefix: string): Promise<T | null | undefined> {
    const raw = await this.redis.get(`${prefix}${hash}`);
    if (raw === null) return undefined;
    if (raw === NOT_FOUND_SENTINEL) return null;
    return JSON.parse(raw) as T;
  }

  async set(
    hash: string,
    prefix: string,
    value: T | null,
    ttlSeconds: number,
  ): Promise<void> {
    const raw = value === null ? NOT_FOUND_SENTINEL : JSON.stringify(value);
    await this.redis.set(`${prefix}${hash}`, raw, 'EX', ttlSeconds);
  }

  async delete(hash: string, prefix: string): Promise<void> {
    await this.redis.del(`${prefix}${hash}`);
  }
}
