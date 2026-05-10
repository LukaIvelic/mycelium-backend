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

  private checkBloom(hash: string): null | undefined {
    return this.bloom.has(hash) ? undefined : null;
  }

  private checkLocalCache(hash: string): ApiKey | null | undefined {
    return this.localCache.get(hash);
  }

  private async checkRedisCache(
    hash: string,
  ): Promise<ApiKey | null | undefined> {
    const key = await this.redisCache.get(hash, this.cachePrefix);
    if (key !== undefined) this.localCache.set(hash, key);
    return key;
  }

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

  private hash(rawKey: string): string {
    return crypto.createHash('sha256').update(rawKey).digest('hex');
  }

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

  async getProjectByApiKeyId(apiKeyId: string) {
    const [row] = await this.db
      .select({ project: projects })
      .from(apiKeys)
      .innerJoin(projects, eq(apiKeys.projectId, projects.id))
      .where(eq(apiKeys.id, apiKeyId));
    if (!row) throw new NotFoundException(Errors.ApiKey.NotFound(apiKeyId));
    return row.project;
  }

  async findByUserId(userId: string): Promise<PublicApiKey[]> {
    const rows = await this.db
      .select({ apiKey: publicApiKeyColumns })
      .from(apiKeys)
      .innerJoin(projects, eq(apiKeys.projectId, projects.id))
      .where(and(eq(projects.userId, userId), isNull(apiKeys.revokedAt)))
      .orderBy(desc(apiKeys.createdAt));
    return rows.map((r) => r.apiKey);
  }

  async hasActiveApiKeyForProject(projectId: string): Promise<boolean> {
    const [row] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(apiKeys)
      .where(and(eq(apiKeys.projectId, projectId), isNull(apiKeys.revokedAt)));
    return (row?.count ?? 0) > 0;
  }

  async countActiveKeysForUser(userId: string): Promise<number> {
    const [row] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(apiKeys)
      .innerJoin(projects, eq(apiKeys.projectId, projects.id))
      .where(and(eq(projects.userId, userId), isNull(apiKeys.revokedAt)));
    return row?.count ?? 0;
  }
}
