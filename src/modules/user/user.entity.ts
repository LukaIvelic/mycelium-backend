import { Exclude, Expose } from 'class-transformer';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  first_name: string;

  @Column()
  last_name: string;

  @Expose()
  get full_name(): string {
    if (!this.first_name || !this.last_name) return '';
    return `${this.first_name} ${this.last_name}`;
  }

  @Expose()
  get initials(): string {
    if (!this.first_name || !this.last_name) return '';
    return `${this.first_name[0]}${this.last_name[0]}`;
  }

  @Column({ unique: true })
  email: string;

  @Exclude()
  @Column({ type: 'varchar', nullable: true })
  password_hash: string | null;

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
