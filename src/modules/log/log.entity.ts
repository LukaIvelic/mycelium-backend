import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Project } from '../project/project.entity';
import { ApiKey } from '../api-key/entities/api_key.entity';
import { LogDetail } from './log-detail.entity';

@Entity()
@Index(['project_id', 'timestamp'])
@Index(['trace_id'])
export class Log {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  project_id: string;

  @ManyToOne(() => Project, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column('uuid')
  api_key_id: string;

  @ManyToOne(() => ApiKey, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'api_key_id' })
  api_key: ApiKey;

  @Column({ type: 'varchar', length: 64 })
  trace_id: string;

  @Column({ type: 'varchar', length: 32 })
  span_id: string;

  @Column({ type: 'varchar', length: 32, nullable: true })
  parent_span_id: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  service_key: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  service_name: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  service_version: string | null;

  @Column({ type: 'text', nullable: true })
  service_description: string | null;

  @Column({ type: 'text', nullable: true })
  service_origin: string | null;

  @Column({ type: 'varchar', length: 16 })
  method: string;

  @Column({ type: 'text' })
  path: string;

  @Column({ type: 'text' })
  origin: string;

  @Column({ type: 'varchar', length: 16 })
  protocol: string;

  @Column({ type: 'int' })
  status_code: number;

  @Column({ type: 'int' })
  duration_ms: number;

  @Column({ type: 'timestamptz' })
  timestamp: Date;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @OneToOne(() => LogDetail, (detail) => detail.log)
  detail?: LogDetail;
}
