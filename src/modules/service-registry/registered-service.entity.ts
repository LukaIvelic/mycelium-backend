import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ApiKey } from '../api-key/entities/api_key.entity';
import { Project } from '../project/project.entity';

@Entity()
@Index(['project_id', 'normalized_origin'], { unique: true })
export class RegisteredService {
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

  @Column({ type: 'text' })
  service_origin: string;

  @Column({ type: 'text' })
  normalized_origin: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  service_key: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  service_name: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  service_version: string | null;

  @Column({ type: 'text', nullable: true })
  service_description: string | null;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  updated_at: Date;
}
