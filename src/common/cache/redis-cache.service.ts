import { Injectable } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import type { Redis } from 'ioredis';

const NOT_FOUND_SENTINEL = '__NOT_FOUND__';

/** Stores serialized cache entries in Redis with TTL support. */
@Injectable()
export class RedisCacheService<T> {
  constructor(@InjectRedis() private readonly redis: Redis) {}

  /**
   * Reads a cached Redis value by prefix and hash.
   * @param hash Cache key suffix.
   * @param prefix Cache key prefix.
   * @returns The cached value, `null` for a cached miss, or `undefined` on cache miss.
   */
  async get(hash: string, prefix: string): Promise<T | null | undefined> {
    const raw = await this.redis.get(`${prefix}${hash}`);
    if (raw === null) return undefined;
    if (raw === NOT_FOUND_SENTINEL) return null;
    return JSON.parse(raw) as T;
  }

  /**
   * Stores a Redis value or cached miss marker with a TTL.
   * @param hash Cache key suffix.
   * @param prefix Cache key prefix.
   * @param value Value to store, or `null` to cache a miss.
   * @param ttlSeconds Expiration time in seconds.
   * @returns A promise that resolves when Redis is updated.
   */
  async set(
    hash: string,
    prefix: string,
    value: T | null,
    ttlSeconds: number,
  ): Promise<void> {
    const raw = value === null ? NOT_FOUND_SENTINEL : JSON.stringify(value);
    await this.redis.set(`${prefix}${hash}`, raw, 'EX', ttlSeconds);
  }

  /**
   * Removes a cached Redis value by prefix and hash.
   * @param hash Cache key suffix.
   * @param prefix Cache key prefix.
   * @returns A promise that resolves when the key is deleted.
   */
  async delete(hash: string, prefix: string): Promise<void> {
    await this.redis.del(`${prefix}${hash}`);
  }
}
