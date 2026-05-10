import { Injectable } from '@nestjs/common';
import { LRUCache } from 'lru-cache';

const NOT_FOUND = Symbol('NOT_FOUND');
type CacheValue<T extends {}> = T | typeof NOT_FOUND;

/** Stores short-lived in-memory cache entries for hash lookups. */
@Injectable()
export class LocalCacheService<T extends {}> {
  private cache = new LRUCache<string, CacheValue<T>>({
    max: 10_000,
    ttl: 60_000,
  });

  /**
   * Reads a cached value by hash.
   * @param hash Cache key suffix.
   * @returns The cached value, `null` for a cached miss, or `undefined` on cache miss.
   */
  get(hash: string): T | null | undefined {
    const value = this.cache.get(hash);
    if (value === undefined) return undefined;
    if (value === NOT_FOUND) return null;
    return value;
  }

  /**
   * Stores a value or cached miss marker by hash.
   * @param hash Cache key suffix.
   * @param value Value to store, or `null` to cache a miss.
   * @returns Nothing.
   */
  set(hash: string, value: T | null): void {
    this.cache.set(hash, value ?? NOT_FOUND);
  }

  /**
   * Removes a cached entry by hash.
   * @param hash Cache key suffix.
   * @returns Nothing.
   */
  delete(hash: string): void {
    this.cache.delete(hash);
  }
}
