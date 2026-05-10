import * as crypto from 'node:crypto';
import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, desc, eq, getTableColumns, isNull, sql } from 'drizzle-orm';
import { BloomService } from '@/common/cache/bloom.service';
import { LocalCacheService } from '@/common/cache/local-cache.service';
import { RedisCacheService } from '@/common/cache/redis-cache.service';
import { type ApiKey, apiKeys, type PublicApiKey, projects } from '@/database';
import { DRIZZLE } from '@/database/database.module';
import type { Database } from '@/database/database.types';
import { Errors } from '@/lib/constants/errors';

const { keyHash: _keyHash, ...publicApiKeyColumns } = getTableColumns(apiKeys);

/** Manages API key validation, caching, creation, and revocation. */
@Injectable()
export class ApiKeyService {
  private readonly ttlValid: number;
  private readonly ttlInvalid: number;
  private readonly apiKeyBytes = 32;
  private readonly apiKeyPrefixLength = 8;
  private readonly cachePrefix = 'apikey:';

  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
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
    const [key] = await this.db
      .select()
      .from(apiKeys)
      .where(and(eq(apiKeys.keyHash, hash), isNull(apiKeys.revokedAt)));

    const result = key ?? null;
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
    const [existing] = await this.db
      .select()
      .from(apiKeys)
      .where(and(eq(apiKeys.projectId, projectId), isNull(apiKeys.revokedAt)));
    if (existing) throw new ConflictException(Errors.ApiKey.ActiveKeyConflict);

    const rawKey = crypto.randomBytes(this.apiKeyBytes).toString('hex');
    const hash = this.hash(rawKey);

    const [entity] = await this.db
      .insert(apiKeys)
      .values({
        projectId,
        name: name ?? '',
        keyPrefix: rawKey.slice(0, this.apiKeyPrefixLength),
        keyHash: hash,
      })
      .returning(publicApiKeyColumns);

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
    const [row] = await this.db
      .select({ apiKey: apiKeys, ownerId: projects.userId })
      .from(apiKeys)
      .innerJoin(projects, eq(apiKeys.projectId, projects.id))
      .where(and(eq(apiKeys.id, apiKeyId), isNull(apiKeys.revokedAt)));

    if (!row) throw new NotFoundException(Errors.ApiKey.NotFound(apiKeyId));
    if (row.ownerId !== userId)
      throw new ForbiddenException(Errors.ApiKey.NotOwner);

    this.bloom.remove(row.apiKey.keyHash);
    this.localCache.delete(row.apiKey.keyHash);
    await this.redisCache.delete(row.apiKey.keyHash, this.cachePrefix);
    const now = new Date();
    await this.db
      .update(apiKeys)
      .set({ revokedAt: now, validTo: now })
      .where(eq(apiKeys.id, row.apiKey.id));
  }

  /**
   * Looks up the project attached to an API key.
   * @param apiKeyId API key identifier.
   * @returns The project that owns the API key.
   */
  async getProjectByApiKeyId(apiKeyId: string) {
    const [row] = await this.db
      .select({ project: projects })
      .from(apiKeys)
      .innerJoin(projects, eq(apiKeys.projectId, projects.id))
      .where(eq(apiKeys.id, apiKeyId));
    if (!row) throw new NotFoundException(Errors.ApiKey.NotFound(apiKeyId));
    return row.project;
  }

  /**
   * Lists active API keys across all projects owned by a user.
   * @param userId Owner identifier.
   * @returns Public API key records ordered by creation time.
   */
  async findByUserId(userId: string): Promise<PublicApiKey[]> {
    const rows = await this.db
      .select({ apiKey: publicApiKeyColumns })
      .from(apiKeys)
      .innerJoin(projects, eq(apiKeys.projectId, projects.id))
      .where(and(eq(projects.userId, userId), isNull(apiKeys.revokedAt)))
      .orderBy(desc(apiKeys.createdAt));
    return rows.map((r) => r.apiKey);
  }

  /**
   * Checks whether a project currently has an active API key.
   * @param projectId Project identifier.
   * @returns `true` when an active key exists, otherwise `false`.
   */
  async hasActiveApiKeyForProject(projectId: string): Promise<boolean> {
    const [row] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(apiKeys)
      .where(and(eq(apiKeys.projectId, projectId), isNull(apiKeys.revokedAt)));
    return (row?.count ?? 0) > 0;
  }

  /**
   * Counts active API keys across all projects owned by a user.
   * @param userId Owner identifier.
   * @returns The number of active keys.
   */
  async countActiveKeysForUser(userId: string): Promise<number> {
    const [row] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(apiKeys)
      .innerJoin(projects, eq(apiKeys.projectId, projects.id))
      .where(and(eq(projects.userId, userId), isNull(apiKeys.revokedAt)));
    return row?.count ?? 0;
  }
}
