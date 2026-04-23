import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Project } from '../project/project.entity';
import { ReactFlowEdgeDto, ReactFlowNodeDto } from './react-flow.dto';

@Entity()
@Index(['project_id'], { unique: true })
export class ReactFlow {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  project_id: string;

  @ManyToOne(() => Project, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column({ type: 'varchar', length: 64 })
  signature: string;

  @Column({ type: 'jsonb' })
  nodes: ReactFlowNodeDto[];

  @Column({ type: 'jsonb' })
  edges: ReactFlowEdgeDto[];
}
