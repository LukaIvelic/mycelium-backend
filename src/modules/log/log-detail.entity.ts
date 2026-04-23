import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from 'typeorm';
import { Log } from './log.entity';

@Entity()
export class LogDetail {
  @PrimaryColumn('uuid')
  log_id: string;

  @OneToOne(() => Log, (log) => log.detail, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'log_id' })
  log: Log;

  @Column({ type: 'double precision', default: 0 })
  body_size_kb: number;

  @Column({ type: 'int', default: 0 })
  content_length: number;

  @Column({ type: 'varchar', length: 255, default: '' })
  content_type: string;

  @Column({ type: 'text', nullable: true })
  body: string | null;

  @Column({ type: 'jsonb', default: {} })
  headers: Record<string, string>;

  @Column({ type: 'boolean', default: false })
  completed: boolean;

  @Column({ type: 'boolean', default: false })
  aborted: boolean;

  @Column({ type: 'boolean', default: false })
  idempotent: boolean;
}
