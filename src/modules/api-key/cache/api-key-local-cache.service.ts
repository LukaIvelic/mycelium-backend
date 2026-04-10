import { Injectable } from '@nestjs/common';
import { ApiKey } from '../entities/api_key.entity';
import { LRUCache } from 'lru-cache';

const NOT_FOUND = Symbol('NOT_FOUND');
type CacheValue = ApiKey | typeof NOT_FOUND;

@Injectable()
export class ApiKeyLocalCacheService {
  private cache = new LRUCache<string, CacheValue>({
    max: 10_000,
    ttl: 60_000,
  });

  get(hash: string): ApiKey | null | undefined {
    const value = this.cache.get(hash);
    if (value === undefined) return undefined;
    if (value === NOT_FOUND) return null;
    return value;
  }

  set(hash: string, value: ApiKey | null): void {
    this.cache.set(hash, value ?? NOT_FOUND);
  }

  delete(hash: string): void {
    this.cache.delete(hash);
  }
}
