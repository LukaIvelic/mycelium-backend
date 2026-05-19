import type { ApiKeyIpStats } from '@/database';

export interface ApiKeyStatsRequest {
  headers?: Record<string, string | string[] | undefined>;
  ip?: string;
  ips?: string[];
  socket?: {
    remoteAddress?: string;
  };
}

export interface ApiKeyStatsDto {
  apiKeyId: string;
  projectId: string;
  totalRequests: number;
  averageLatencyMs: number;
  ipStats: ApiKeyIpStats[];
}
