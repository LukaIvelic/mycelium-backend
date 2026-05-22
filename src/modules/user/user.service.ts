import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Errors } from '@/lib/constants/errors';
import type { CreateUserDto, UpdateUserDto } from './user.dto';
import { toPublicUser } from './user.mapper';
import { UserRepository } from './user.repository';

const SALT_ROUNDS = 10;

/** Manages user lookup, creation, updates, and soft deletion. */
@Injectable()
export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  /**
   * Finds a single active user by id.
   * @param id User identifier.
   * @returns The public user response.
   */
  async findOne(id: string) {
    const user = await this.userRepository.findActiveById(id);
    if (!user) throw new NotFoundException(Errors.User.NotFound(id));
    return toPublicUser(user);
  }

  /**
   * Finds an active user by email address.
   * @param email User email address.
   * @returns The full user record, or `null` when not found.
   */
  async findByEmail(email: string) {
    return this.userRepository.findActiveByEmail(email);
  }

  /**
   * Creates a new user with a hashed password.
   * @param dto User creation payload.
   * @returns The created public user response.
   */
  async create(dto: CreateUserDto) {
    const existing = await this.userRepository.findActiveByEmail(dto.email);
    if (existing) throw new ConflictException(Errors.User.EmailConflict);

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);

    const user = await this.userRepository.insert({
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      passwordHash,
    });

    return toPublicUser(user);
  }

  /**
   * Updates an existing user and re-hashes the password when provided.
   * @param id User identifier.
   * @param dto Partial user changes.
   * @returns The updated public user response.
   */
  async update(id: string, dto: UpdateUserDto) {
    this.validate(dto);

    const { password, ...rest } = dto;
    const data = {
      ...rest,
      passwordHash: password && (await bcrypt.hash(password, SALT_ROUNDS)),
      updatedAt: new Date(),
    };

    await this.userRepository.update(id, data);

    return this.findOne(id);
  }

  /**
   * Soft deletes a user by setting its validity end date.
   * @param id User identifier.
   * @returns A promise that resolves when the user is archived.
   */
  async delete(id: string) {
    await this.userRepository.softDelete(id);
  }

  /**
   * Ensures an update payload contains at least one defined value.
   * @param dto Partial user update payload.
   * @returns Nothing.
   */
  private validate(dto: UpdateUserDto): void {
    const hasNoDefinedValues = Object.values(dto).every((v) => v === undefined);

    if (hasNoDefinedValues) {
      throw new BadRequestException(Errors.User.NoUpdateFields);
    }
  }
}
