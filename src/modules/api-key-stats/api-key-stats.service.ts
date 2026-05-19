import { Inject, Injectable } from '@nestjs/common';
import { desc, eq, sql } from 'drizzle-orm';
import { apiKeyIpStats, apiKeys, type Log, logs } from '@/database';
import { DRIZZLE } from '@/database/database.module';
import type { Database } from '@/database/database.types';
import { ProjectService } from '../project/project.service';
import type { ApiKeyStatsDto, ApiKeyStatsRequest } from './api-key-stats.dto';

const UNKNOWN_VALUE = 'unknown';

/** Tracks and reads API key usage statistics. */
@Injectable()
export class ApiKeyStatsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly projectService: ProjectService,
  ) {}

  /**
   * Updates usage counters for an API key when a log is ingested.
   * @param apiKeyId API key used to create the log.
   * @param log Persisted log record.
   * @param request Incoming log-ingestion request metadata.
   * @param tx Optional transaction handle to join the log write.
   * @returns A promise that resolves when stats are updated.
   */
  async trackLogIngest(
    apiKeyId: string,
    log: Log,
    request: ApiKeyStatsRequest,
    tx?: Database,
  ): Promise<void> {
    const database = tx ?? this.db;
    const now = new Date();
    const ip = this.extractIp(request);
    const country = this.extractCountry(request);

    await database
      .update(apiKeys)
      .set({
        lastUsedAt: now,
        lastUsedIp: ip,
        usageCount: sql`${apiKeys.usageCount} + 1`,
      })
      .where(eq(apiKeys.id, apiKeyId));

    await database
      .insert(apiKeyIpStats)
      .values({
        apiKeyId,
        ip,
        firstSeen: log.createdAt,
        lastSeen: now,
        requestCount: 1,
        country,
      })
      .onConflictDoUpdate({
        target: [apiKeyIpStats.apiKeyId, apiKeyIpStats.ip],
        set: {
          lastSeen: now,
          requestCount: sql`${apiKeyIpStats.requestCount} + 1`,
          country,
        },
      });
  }

  /**
   * Finds usage stats for an API key after verifying project ownership.
   * @param apiKeyId API key identifier.
   * @param userId User requesting the stats.
   * @returns The API key stats summary and per-IP rows.
   */
  async findByApiKeyId(
    apiKeyId: string,
    userId: string,
  ): Promise<ApiKeyStatsDto> {
    const project = await this.projectService.findByApiKeyId(apiKeyId, userId);
    const [latency] = await this.db
      .select({
        totalRequests: sql<number>`count(${logs.id})::int`,
        averageLatencyMs: sql<number>`coalesce(round(avg(${logs.durationMs})), 0)::int`,
      })
      .from(logs)
      .where(eq(logs.apiKeyId, apiKeyId));

    const ipStats = await this.db
      .select()
      .from(apiKeyIpStats)
      .where(eq(apiKeyIpStats.apiKeyId, apiKeyId))
      .orderBy(desc(apiKeyIpStats.lastSeen));

    return {
      apiKeyId,
      projectId: project.id,
      totalRequests: latency?.totalRequests ?? 0,
      averageLatencyMs: latency?.averageLatencyMs ?? 0,
      ipStats,
    };
  }

  /**
   * Extracts the client IP from proxy headers or request metadata.
   * @param request Incoming request metadata.
   * @returns The best available public client IP.
   */
  private extractIp(request: ApiKeyStatsRequest): string {
    const directIp =
      this.getHeader(request, 'cf-connecting-ip') ??
      this.getHeader(request, 'x-real-ip') ??
      this.getHeader(request, 'x-client-ip') ??
      this.getHeader(request, 'true-client-ip');

    if (directIp) {
      return directIp.trim();
    }

    const forwardedFor = this.getHeader(request, 'x-forwarded-for');

    if (forwardedFor) {
      const firstPublicIp = forwardedFor
        .split(',')
        .map((ip) => ip.trim())
        .find((ip) => !this.isPrivateIp(ip));

      return (
        firstPublicIp ?? forwardedFor.split(',')[0]?.trim() ?? UNKNOWN_VALUE
      );
    }

    return (
      request.ips?.find((ip) => !this.isPrivateIp(ip)) ??
      request.ips?.[0] ??
      request.ip ??
      request.socket?.remoteAddress ??
      UNKNOWN_VALUE
    );
  }

  /**
   * Checks whether an IP address belongs to a private or internal range.
   * @param ip IP address to validate.
   * @returns `true` when the IP is private or internal.
   */
  private isPrivateIp(ip: string): boolean {
    return (
      ip === '127.0.0.1' ||
      ip === '::1' ||
      ip.startsWith('10.') ||
      ip.startsWith('192.168.') ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(ip) ||
      /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(ip)
    );
  }

  /**
   * Extracts the country code from common platform headers.
   * @param request Incoming request metadata.
   * @returns The country code, or `unknown` when absent.
   */
  private extractCountry(request: ApiKeyStatsRequest): string {
    const country =
      this.getHeader(request, 'cf-ipcountry') ??
      this.getHeader(request, 'x-vercel-ip-country') ??
      this.getHeader(request, 'x-country-code') ??
      this.getHeader(request, 'cloudfront-viewer-country');

    console.log(request.headers);

    return country?.trim().toUpperCase() || UNKNOWN_VALUE;
  }

  /**
   * Reads a normalized header value from request metadata.
   * @param request Incoming request metadata.
   * @param name Header name to read.
   * @returns The first header value, or `undefined` when absent.
   */
  private getHeader(
    request: ApiKeyStatsRequest,
    name: string,
  ): string | undefined {
    const value =
      request.headers?.[name] ?? request.headers?.[name.toLowerCase()];
    if (Array.isArray(value)) return value[0];
    return value;
  }
}
