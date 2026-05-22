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

export interface IpApiDetails {
  query: string;
  status: string;
  country?: string;
  countryCode?: string;
  region?: string;
  regionName?: string;
  city?: string;
  zip?: string;
  lat?: number;
  lon?: number;
  timezone?: string;
  isp?: string;
  org?: string;
  as?: string;
}
