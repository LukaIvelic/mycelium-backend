import { Exclude } from 'class-transformer';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Project } from '../../project/project.entity';

@Entity()
export class ApiKey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, nullable: false, default: '' })
  name: string;

  @Column('uuid')
  project_id: string;

  @ManyToOne(() => Project, { nullable: false })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column({ length: 8 })
  key_prefix: string;

  @Exclude()
  @Column({ length: 64, unique: true })
  key_hash: string;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  valid_from: Date;

  @Column({ type: 'timestamptz', nullable: true })
  valid_to: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  revoked_at: Date | null;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  last_used_at: Date;

  @Exclude()
  @Column({ type: 'inet', nullable: true })
  last_used_ip: string | null;

  @Column({ type: 'bigint', default: 0 })
  usage_count: number;

  @Column({ type: 'int', default: 0 })
  rate_limit_per_minute: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata: any;
}
