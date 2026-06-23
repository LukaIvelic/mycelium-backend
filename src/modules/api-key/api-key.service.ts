import * as crypto from 'node:crypto';
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BloomService } from '@/common/cache/bloom.service';
import { LocalCacheService } from '@/common/cache/local-cache.service';
import { RedisCacheService } from '@/common/cache/redis-cache.service';
import type { ApiKey, PublicApiKey } from '@/database';
import { Errors } from '@/lib/constants/errors';
import { ApiKeyRepository } from './api-key.repository';

/** Manages API key validation, caching, creation, and revocation. */
@Injectable()
export class ApiKeyService {
  private readonly ttlValid: number;
  private readonly ttlInvalid: number;
  private readonly apiKeyBytes = 32;
  private readonly apiKeyPrefixLength = 8;
  private readonly cachePrefix = 'apikey:';

  constructor(
    private readonly apiKeyRepository: ApiKeyRepository,
    private readonly bloom: BloomService,
    private readonly localCache: LocalCacheService<ApiKey>,
    private readonly redisCache: RedisCacheService<ApiKey>,
    private readonly config: ConfigService,
  ) {
    this.ttlValid = this.config.get<number>('API_KEY_TTL_VALID_SECONDS', 600);
    this.ttlInvalid = this.config.get<number>(
      'API_KEY_TTL_INVALID_SECONDS',
      30,
    );
  }

  /**
   * Validates a raw API key through bloom, cache, and database checks.
   * @param rawKey Raw API key value from the client.
   * @returns The active API key record, or `null` when the key is invalid.
   */
  async validateApiKey(rawKey: string): Promise<ApiKey | null> {
    const hash = this.hash(rawKey);

    const bloomResult = this.checkBloom(hash);
    if (bloomResult !== undefined) return bloomResult;

    const localCacheResult = this.checkLocalCache(hash);
    if (localCacheResult !== undefined) return localCacheResult;

    const redisCacheResult = await this.checkRedisCache(hash);
    if (redisCacheResult !== undefined) return redisCacheResult;

    return this.checkDatabase(hash);
  }

  /**
   * Performs the bloom-filter existence shortcut for a key hash.
   * @param hash Hashed API key value.
   * @returns `null` when the key is definitely absent, otherwise `undefined`.
   */
  private checkBloom(hash: string): null | undefined {
    return this.bloom.has(hash) ? undefined : null;
  }

  /**
   * Reads a cached API key result from local memory.
   * @param hash Hashed API key value.
   * @returns The cached key, `null` for a cached miss, or `undefined` on cache miss.
   */
  private checkLocalCache(hash: string): ApiKey | null | undefined {
    return this.localCache.get(hash);
  }

  /**
   * Reads a cached API key result from Redis and warms the local cache.
   * @param hash Hashed API key value.
   * @returns The cached key, `null` for a cached miss, or `undefined` on cache miss.
   */
  private async checkRedisCache(
    hash: string,
  ): Promise<ApiKey | null | undefined> {
    const key = await this.redisCache.get(hash, this.cachePrefix);
    if (key !== undefined) this.localCache.set(hash, key);
    return key;
  }

  /**
   * Loads an API key from the database and updates both cache layers.
   * @param hash Hashed API key value.
   * @returns The active API key, or `null` when not found.
   */
  private async checkDatabase(hash: string): Promise<ApiKey | null> {
    const result = await this.apiKeyRepository.findActiveByHash(hash);
    const ttl = result ? this.ttlValid : this.ttlInvalid;
    await this.redisCache.set(hash, this.cachePrefix, result, ttl);
    this.localCache.set(hash, result);

    return result;
  }

  /**
   * Hashes a raw API key for lookup and storage checks.
   * @param rawKey Raw API key value.
   * @returns The SHA-256 hash of the key.
   */
  private hash(rawKey: string): string {
    return crypto.createHash('sha256').update(rawKey).digest('hex');
  }

  /**
   * Creates a new active API key for a project.
   * @param projectId Project that will own the key.
   * @param name Optional display name for the key.
   * @returns The raw key plus its persisted public record.
   */
  async createApiKey(
    projectId: string,
    name?: string,
  ): Promise<{ key: string; message: string; entity: PublicApiKey }> {
    const existing =
      await this.apiKeyRepository.findActiveByProjectId(projectId);
    if (existing) throw new ConflictException(Errors.ApiKey.ActiveKeyConflict);

    const rawKey = crypto.randomBytes(this.apiKeyBytes).toString('hex');
    const hash = this.hash(rawKey);

    const entity = await this.apiKeyRepository.insert({
      projectId,
      name: name ?? '',
      keyPrefix: rawKey.slice(0, this.apiKeyPrefixLength),
      keyHash: hash,
    });

    this.bloom.add(hash);

    return {
      key: rawKey,
      message: 'Store this key securely. It will not be shown again.',
      entity,
    };
  }

  /**
   * Revokes an active API key owned by the given user.
   * @param apiKeyId API key identifier to revoke.
   * @param userId User who must own the key's project.
   * @returns A promise that resolves when the key is revoked.
   */
  async revokeApiKey(apiKeyId: string, userId: string): Promise<void> {
    const row = await this.apiKeyRepository.findActiveWithOwner(apiKeyId);

    if (!row) throw new NotFoundException(Errors.ApiKey.NotFound(apiKeyId));
    if (row.ownerId !== userId)
      throw new ForbiddenException(Errors.ApiKey.NotOwner);

    this.bloom.remove(row.apiKey.keyHash);
    this.localCache.delete(row.apiKey.keyHash);
    await this.redisCache.delete(row.apiKey.keyHash, this.cachePrefix);
    await this.apiKeyRepository.revoke(row.apiKey.id, new Date());
  }

  /**
   * Looks up the project attached to an API key.
   * @param apiKeyId API key identifier.
   * @returns The project that owns the API key.
   */
  async getProjectByApiKeyId(apiKeyId: string) {
    const project = await this.apiKeyRepository.findProjectById(apiKeyId);
    if (!project) throw new NotFoundException(Errors.ApiKey.NotFound(apiKeyId));
    return project;
  }

  /**
   * Lists active API keys across all projects owned by a user.
   * @param userId Owner identifier.
   * @returns Public API key records ordered by creation time.
   */
  async findByUserId(userId: string): Promise<PublicApiKey[]> {
    return this.apiKeyRepository.findPublicActiveByUserId(userId);
  }

  /**
   * Loads the active API key for a project.
   * @param projectId Project identifier.
   * @returns The active API key, or `null` when none exists.
   */
  findActiveKeyForProject(projectId: string): Promise<ApiKey | null> {
    return this.apiKeyRepository.findActiveByProjectId(projectId);
  }

  /**
   * Checks whether a project currently has an active API key.
   * @param projectId Project identifier.
   * @returns `true` when an active key exists, otherwise `false`.
   */
  async hasActiveApiKeyForProject(projectId: string): Promise<boolean> {
    const count = await this.apiKeyRepository.countActiveByProjectId(projectId);
    return count > 0;
  }

  /**
   * Counts active API keys across all projects owned by a user.
   * @param userId Owner identifier.
   * @returns The number of active keys.
   */
  async countActiveKeysForUser(userId: string): Promise<number> {
    return this.apiKeyRepository.countActiveByUserId(userId);
  }
}
