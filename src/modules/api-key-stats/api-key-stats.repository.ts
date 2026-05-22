import { Inject, Injectable } from '@nestjs/common';
import { desc, eq, sql } from 'drizzle-orm';
import { type ApiKeyIpStats, apiKeyIpStats, apiKeys, logs } from '@/database';
import { DRIZZLE } from '@/database/database.module';
import type { Database } from '@/database/database.types';
import type { IpApiDetails } from './api-key-stats.dto';

interface IncrementApiKeyUsageArgs {
  apiKeyId: string;
  lastUsedAt: Date;
  lastUsedIp: string;
}

interface IncrementIpStatsArgs {
  apiKeyId: string;
  ip: string;
  firstSeen: Date;
  lastSeen: Date;
  country: string;
  detailed: IpApiDetails | null;
}

interface LatencySummary {
  totalRequests: number;
  averageLatencyMs: number;
}

/** Data access for API key usage counters and per-IP statistics. */
@Injectable()
export class ApiKeyStatsRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  /**
   * Increments the rolling usage counters for an API key.
   * @param args Per-request counter update payload.
   * @param tx Optional transaction handle to join an existing write flow.
   * @returns A promise that resolves when the update completes.
   */
  async incrementApiKeyUsage(
    args: IncrementApiKeyUsageArgs,
    tx?: Database,
  ): Promise<void> {
    await (tx ?? this.db)
      .update(apiKeys)
      .set({
        lastUsedAt: args.lastUsedAt,
        lastUsedIp: args.lastUsedIp,
        usageCount: sql`${apiKeys.usageCount} + 1`,
      })
      .where(eq(apiKeys.id, args.apiKeyId));
  }

  /**
   * Inserts or increments the per-IP usage row for an API key.
   * @param args Per-IP usage payload.
   * @param tx Optional transaction handle to join an existing write flow.
   * @returns A promise that resolves when the upsert completes.
   */
  async incrementIpStats(
    args: IncrementIpStatsArgs,
    tx?: Database,
  ): Promise<void> {
    await (tx ?? this.db)
      .insert(apiKeyIpStats)
      .values({
        apiKeyId: args.apiKeyId,
        ip: args.ip,
        firstSeen: args.firstSeen,
        lastSeen: args.lastSeen,
        requestCount: 1,
        country: args.country,
        detailed: args.detailed,
      })
      .onConflictDoUpdate({
        target: [apiKeyIpStats.apiKeyId, apiKeyIpStats.ip],
        set: {
          lastSeen: args.lastSeen,
          requestCount: sql`${apiKeyIpStats.requestCount} + 1`,
          country: args.country,
          ...(args.detailed ? { detailed: args.detailed } : {}),
        },
      });
  }

  /**
   * Aggregates request count and average latency for an API key's logs.
   * @param apiKeyId API key identifier.
   * @returns The aggregated request count and average latency.
   */
  async findLatencySummary(apiKeyId: string): Promise<LatencySummary> {
    const [row] = await this.db
      .select({
        totalRequests: sql<number>`count(${logs.id})::int`,
        averageLatencyMs: sql<number>`coalesce(round(avg(${logs.durationMs})), 0)::int`,
      })
      .from(logs)
      .where(eq(logs.apiKeyId, apiKeyId));

    return {
      totalRequests: row?.totalRequests ?? 0,
      averageLatencyMs: row?.averageLatencyMs ?? 0,
    };
  }

  /**
   * Lists per-IP usage rows for an API key ordered by most recent activity.
   * @param apiKeyId API key identifier.
   * @returns Per-IP usage rows.
   */
  async findIpStatsByApiKeyId(apiKeyId: string): Promise<ApiKeyIpStats[]> {
    return this.db
      .select()
      .from(apiKeyIpStats)
      .where(eq(apiKeyIpStats.apiKeyId, apiKeyId))
      .orderBy(desc(apiKeyIpStats.lastSeen));
  }
}
