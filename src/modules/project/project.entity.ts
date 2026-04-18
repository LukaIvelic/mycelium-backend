import { Exclude } from 'class-transformer';
import { Column, Entity, JoinColumn, JoinTable, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from '../user/user.entity';
import { ApiKey } from '../api-key/entities/api_key.entity';

@Entity()
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => ApiKey, { nullable: true})
  @JoinColumn({ name: 'api_key' })
  api_key: ApiKey | null;

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
