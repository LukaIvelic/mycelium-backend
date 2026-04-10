import { Exclude } from 'class-transformer';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Exclude()
  @Column()
  first_name: string;

  @Exclude()
  @Column()
  last_name: string;

  @Exclude()
  @Column()
  email: string;

  @Exclude()
  @Column()
  password_hash: string;

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
