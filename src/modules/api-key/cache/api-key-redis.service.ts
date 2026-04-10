import { Injectable } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { Redis } from 'ioredis';
import { ApiKey } from '../entities/api_key.entity';

const KEY_PREFIX = 'apikey:';
const NOT_FOUND_SENTINEL = '__NOT_FOUND__';

@Injectable()
export class ApiKeyRedisCacheService {
  constructor(@InjectRedis() private readonly redis: Redis) {}

  async get(hash: string): Promise<ApiKey | null | undefined> {
    const raw = await this.redis.get(this.key(hash));

    if (raw === null) return undefined;
    if (raw === NOT_FOUND_SENTINEL) return null;

    return JSON.parse(raw) as ApiKey;
  }

  async set(
    hash: string,
    value: ApiKey | null,
    ttlSeconds: number,
  ): Promise<void> {
    const raw = value ?? NOT_FOUND_SENTINEL;
    await this.redis.set(this.key(hash), JSON.stringify(raw), 'EX', ttlSeconds);
  }

  async delete(hash: string): Promise<void> {
    await this.redis.del(this.key(hash));
  }

  private key(hash: string): string {
    return `${KEY_PREFIX}${hash}`;
  }
}
