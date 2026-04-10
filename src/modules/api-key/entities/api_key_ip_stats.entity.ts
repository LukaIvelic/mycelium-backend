import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity()
export class ApiKeyIpStats {
  @PrimaryColumn({ type: 'uuid' })
  api_key_id: string;

  @PrimaryColumn({ type: 'inet' })
  ip: string;

  @Column()
  first_seen: Date;

  @Column()
  last_seen: Date;

  @Column()
  request_count: number;

  @Column()
  country: string;
}
