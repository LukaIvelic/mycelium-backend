import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './user.entity';
import { CreateUserDto } from './user.dto';

const SALT_ROUNDS = 10;

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async findOne(id: string): Promise<User> {
    const user = await this.userRepository.findOneBy({
      id,
      valid_to: IsNull(),
    });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOneBy({ email, valid_to: IsNull() });
  }

  async create(dto: CreateUserDto): Promise<User> {
    const existing = await this.userRepository.findOneBy({ email: dto.email });
    if (existing) throw new ConflictException('Email already in use');
    const password_hash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const { password, ...rest } = dto;
    const user = this.userRepository.create({ ...rest, password_hash });
    return this.userRepository.save(user);
  }

  async update(id: string, dto: Partial<CreateUserDto>): Promise<User> {
    const data: Partial<User> = { ...(dto as any), updated_at: new Date() };
    if (dto.password) {
      data.password_hash = await bcrypt.hash(dto.password, SALT_ROUNDS);
      delete (data as any).password;
    }
    await this.userRepository.update(id, data);
    return this.findOne(id);
  }

  async invalidate(id: string): Promise<void> {
    const user = await this.findOne(id);
    user.valid_to = new Date();
    await this.userRepository.save(user);
  }
}
