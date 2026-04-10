import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity()
export class ApiKeyDailyStats {
  @PrimaryColumn('uuid')
  id: string;

  @PrimaryColumn('uuid')
  api_key_id: string;

  @Column()
  total_requests: number;

  @Column()
  successful_requests: number;

  @Column()
  error_requests: number;

  @Column()
  average_latency_ms: number;

  @Column()
  p95_latency_ms: number;

  @Column()
  total_bytes_in: number;

  @Column()
  total_bytes_out: number;

  @Column()
  unique_ips: number;
}
