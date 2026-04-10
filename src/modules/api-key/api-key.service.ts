import { Injectable, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import * as crypto from 'crypto';
import { ApiKey } from './entities/api_key.entity';
import { ApiKeyDailyStats } from './entities/api_key_daily_stats.entity';
import { ApiKeyIpStats } from './entities/api_key_ip_stats.entity';
import { ApiKeyBloomService } from './cache/api-key-bloom.service';
import { ApiKeyLocalCacheService } from './cache/api-key-local-cache.service';
import { ApiKeyRedisCacheService } from './cache/api-key-redis.service';

@Injectable()
export class ApiKeyService {
  private readonly ttlValid: number;
  private readonly ttlInvalid: number;
  private readonly apiKeyBytes = 32;
  private readonly apiKeyPrefixLength = 8;

  constructor(
    @InjectRepository(ApiKey)
    private readonly apiKeyRepository: Repository<ApiKey>,
    @InjectRepository(ApiKeyDailyStats)
    private readonly apiKeyDailyStatsRepository: Repository<ApiKeyDailyStats>,
    @InjectRepository(ApiKeyIpStats)
    private readonly apiKeyIpStatsRepository: Repository<ApiKeyIpStats>,
    private readonly bloom: ApiKeyBloomService,
    private readonly localCache: ApiKeyLocalCacheService,
    private readonly redisCache: ApiKeyRedisCacheService,
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
    return (
      this.checkBloom(hash) ??
      this.checkLocalCache(hash) ??
      (await this.checkRedisCache(hash)) ??
      (await this.checkDatabase(hash))
    );
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
    const key = await this.redisCache.get(hash);
    if (key !== undefined) this.localCache.set(hash, key);
    return key;
  }

  private async checkDatabase(hash: string): Promise<ApiKey | null> {
    const key = await this.apiKeyRepository.findOne({
      where: { key_hash: hash, revoked_at: IsNull() },
    });

    const ttl = key ? this.ttlValid : this.ttlInvalid;
    await this.redisCache.set(hash, key, ttl);
    this.localCache.set(hash, key);

    return key;
  }

  async createApiKey(
    userId: string,
  ): Promise<{ key: string; message: string; entity: ApiKey }> {
    const existing = await this.apiKeyRepository.findOne({
      where: { user_id: userId, revoked_at: IsNull() },
    });
    if (existing)
      throw new ConflictException(
        'Revoke your existing API key before creating a new one',
      );

    const rawKey = crypto.randomBytes(this.apiKeyBytes).toString('hex');
    const hash = this.hash(rawKey);

    const entity = this.apiKeyRepository.create({
      user_id: userId,
      key_prefix: rawKey.slice(0, this.apiKeyPrefixLength),
      key_hash: hash,
      valid_from: new Date(),
    });

    await this.apiKeyRepository.save(entity);
    this.bloom.add(hash);

    return {
      key: rawKey,
      message: 'Store this key securely. It will not be shown again.',
      entity,
    };
  }

  async revokeApiKey(userId: string): Promise<void> {
    const existing = await this.apiKeyRepository.findOne({
      where: { user_id: userId, revoked_at: IsNull() },
    });
    if (!existing) return;

    this.bloom.remove(existing.key_hash);
    this.localCache.delete(existing.key_hash);
    await this.redisCache.delete(existing.key_hash);
    await this.apiKeyRepository.update(existing.id, { revoked_at: new Date() });
  }

  private hash(rawKey: string): string {
    return crypto.createHash('sha256').update(rawKey).digest('hex');
  }
}
