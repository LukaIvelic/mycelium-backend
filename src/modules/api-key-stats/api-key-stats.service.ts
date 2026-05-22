import { Injectable } from '@nestjs/common';
import type { Log } from '@/database';
import type { Database } from '@/database/database.types';
import { ProjectService } from '../project/project.service';
import type {
  ApiKeyStatsDto,
  ApiKeyStatsRequest,
  IpApiDetails,
} from './api-key-stats.dto';
import { ApiKeyStatsRepository } from './api-key-stats.repository';

const UNKNOWN_VALUE = 'unknown';
const IP_API_BASE_URL = 'http://ip-api.com/json';
const IP_API_TIMEOUT_MS = 1_500;

/** Tracks and reads API key usage statistics. */
@Injectable()
export class ApiKeyStatsService {
  constructor(
    private readonly apiKeyStatsRepository: ApiKeyStatsRepository,
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
    const now = new Date();
    const ip = this.extractIp(request);
    const { country, detailed } = await this.extractCountry(request, ip);

    await this.apiKeyStatsRepository.incrementApiKeyUsage(
      {
        apiKeyId,
        lastUsedAt: now,
        lastUsedIp: ip,
      },
      tx,
    );

    await this.apiKeyStatsRepository.incrementIpStats(
      {
        apiKeyId,
        ip,
        firstSeen: log.createdAt,
        lastSeen: now,
        country,
        detailed,
      },
      tx,
    );
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

    const latency =
      await this.apiKeyStatsRepository.findLatencySummary(apiKeyId);

    const ipStats =
      await this.apiKeyStatsRepository.findIpStatsByApiKeyId(apiKeyId);

    return {
      apiKeyId,
      projectId: project.id,
      totalRequests: latency.totalRequests,
      averageLatencyMs: latency.averageLatencyMs,
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
   * Extracts the country from headers or resolves it with the IP API.
   * @param request Incoming request metadata.
   * @param ip Client IP address to resolve when no country header exists.
   * @returns The country and full IP lookup details when available.
   */
  private async extractCountry(
    request: ApiKeyStatsRequest,
    ip: string,
  ): Promise<{ country: string; detailed: IpApiDetails | null }> {
    const country =
      this.getHeader(request, 'cf-ipcountry') ??
      this.getHeader(request, 'x-vercel-ip-country') ??
      this.getHeader(request, 'x-country-code') ??
      this.getHeader(request, 'cloudfront-viewer-country');

    if (country) {
      return { country: country.trim().toUpperCase(), detailed: null };
    }

    const detailed = await this.findCountryByIp(ip);

    return {
      country: detailed?.country ?? detailed?.countryCode ?? UNKNOWN_VALUE,
      detailed,
    };
  }

  /**
   * Resolves IP location details from the external IP API.
   * @param ip Client IP address to resolve.
   * @returns The IP API payload, or `null` when lookup fails.
   */
  private async findCountryByIp(ip: string): Promise<IpApiDetails | null> {
    if (ip === UNKNOWN_VALUE || this.isPrivateIp(ip)) return null;

    try {
      const response = await fetch(
        `${IP_API_BASE_URL}/${encodeURIComponent(ip)}`,
        {
          signal: AbortSignal.timeout(IP_API_TIMEOUT_MS),
        },
      );
      if (!response.ok) return null;

      const detailed = (await response.json()) as IpApiDetails;
      if (detailed.status !== 'success') return null;

      return detailed;
    } catch {
      return null;
    }
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
