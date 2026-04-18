import { Exclude } from 'class-transformer';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../user/user.entity';

@Entity()
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'varchar', nullable: true })
  description: string | null;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Exclude()
  @Column({ default: () => 'CURRENT_TIMESTAMP' })
  valid_from: Date;

  @Exclude()
  @Column({ default: null })
  valid_to: Date;

  @Column({ default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Exclude()
  @Column({ default: null })
  updated_at: Date;
}
