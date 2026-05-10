import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { and, eq, getTableColumns, isNull } from 'drizzle-orm';
import { users } from '@/database';
import { DRIZZLE } from '@/database/database.module';
import type { Database } from '@/database/database.types';
import { Errors } from '@/lib/constants/errors';
import type { CreateUserDto, UpdateUserDto } from './user.dto';
import { toPublicUser } from './user.mapper';

const SALT_ROUNDS = 10;
const { passwordHash: _passwordHash, ...publicUserColumns } =
  getTableColumns(users);

@Injectable()
export class UserService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async findOne(id: string) {
    const [user] = await this.db
      .select(publicUserColumns)
      .from(users)
      .where(and(eq(users.id, id), isNull(users.validTo)));

    if (!user) throw new NotFoundException(Errors.User.NotFound(id));
    return toPublicUser(user);
  }

  async findByEmail(email: string) {
    const [user] = await this.db
      .select()
      .from(users)
      .where(and(eq(users.email, email), isNull(users.validTo)));

    return user ?? null;
  }

  async create(dto: CreateUserDto) {
    const existing = await this.findByEmail(dto.email);
    if (existing) throw new ConflictException(Errors.User.EmailConflict);

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);

    const [user] = await this.db
      .insert(users)
      .values({
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        passwordHash: passwordHash,
      })
      .returning(publicUserColumns);

    return toPublicUser(user);
  }

  async update(id: string, dto: UpdateUserDto) {
    this.validate(dto);

    const { password, ...rest } = dto;
    const data = {
      ...rest,
      passwordHash: password && (await bcrypt.hash(password, SALT_ROUNDS)),
      updatedAt: new Date(),
    };

    await this.db.update(users).set(data).where(eq(users.id, id));

    return this.findOne(id);
  }

  async delete(id: string) {
    await this.db
      .update(users)
      .set({ validTo: new Date() })
      .where(eq(users.id, id));
  }

  private validate(dto: UpdateUserDto): void {
    const hasNoDefinedValues = Object.values(dto).every((v) => v === undefined);

    if (hasNoDefinedValues) {
      throw new BadRequestException(Errors.User.NoUpdateFields);
    }
  }
}
