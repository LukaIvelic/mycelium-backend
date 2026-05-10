import { Injectable } from '@nestjs/common';
import { LRUCache } from 'lru-cache';

const NOT_FOUND = Symbol('NOT_FOUND');
type CacheValue<T extends {}> = T | typeof NOT_FOUND;

@Injectable()
export class LocalCacheService<T extends {}> {
  private cache = new LRUCache<string, CacheValue<T>>({
    max: 10_000,
    ttl: 60_000,
  });

  get(hash: string): T | null | undefined {
    const value = this.cache.get(hash);
    if (value === undefined) return undefined;
    if (value === NOT_FOUND) return null;
    return value;
  }

  set(hash: string, value: T | null): void {
    this.cache.set(hash, value ?? NOT_FOUND);
  }

  delete(hash: string): void {
    this.cache.delete(hash);
  }
}
