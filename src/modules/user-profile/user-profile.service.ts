import { randomBytes } from 'node:crypto';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { uniqueUsernameGenerator } from 'unique-username-generator';
import type { UserProfile } from '@/database';
import { Errors } from '@/lib/constants/errors';
import type { UpdateUserProfileDto } from './user-profile.dto';
import { UserProfileRepository } from './user-profile.repository';

/** Manages user profile metadata and username generation. */
@Injectable()
export class UserProfileService {
  constructor(private readonly userProfileRepository: UserProfileRepository) {}

  /**
   * Finds a user profile by user id.
   * @param userId User identifier.
   * @returns The matching profile.
   */
  async findOne(userId: string): Promise<UserProfile> {
    const profile = await this.userProfileRepository.findByUserId(userId);
    if (!profile)
      throw new NotFoundException(Errors.UserProfile.NotFound(userId));
    return profile;
  }

  /**
   * Creates a profile for a user.
   * @param userId User identifier.
   * @param firstName User first name.
   * @param lastName User last name.
   * @param email User email address.
   * @returns The created profile.
   */
  async create(
    userId: string,
    firstName: string,
    lastName: string,
    email: string,
  ): Promise<UserProfile> {
    return this.userProfileRepository.insert({
      userId,
      firstName,
      lastName,
      username: await this.generateUniqueUsername(firstName, lastName),
      randomProfileHex: this.generateRandomProfileHex(),
      email,
    });
  }

  /**
   * Updates profile fields for a user.
   * @param userId User identifier.
   * @param values Partial profile changes.
   * @returns A promise that resolves when the update completes.
   */
  async update(
    userId: string,
    values: UpdateUserProfileDto,
  ): Promise<UserProfile> {
    this.validate(values);

    await this.userProfileRepository.upsert(userId, values);
    return this.findOne(userId);
  }

  /**
   * Generates a unique username from the user's first and last name.
   * @param firstName User first name.
   * @param lastName User last name.
   * @returns The generated username.
   */
  private async generateUniqueUsername(
    firstName: string,
    lastName: string,
  ): Promise<string> {
    const defaultUsername = 'user';
    const firstNameUsernamePart = this.normalizeUsernamePart(firstName);
    const lastNameUsernamePart = this.normalizeUsernamePart(lastName);
    const hasUsernameParts = firstNameUsernamePart || lastNameUsernamePart;
    let usernamePrefix = defaultUsername;

    if (hasUsernameParts) {
      usernamePrefix = uniqueUsernameGenerator({
        dictionaries: [[firstNameUsernamePart], [lastNameUsernamePart]],
        separator: '',
        randomDigits: 0,
        style: 'lowerCase',
        length: 32,
      });
    }

    if (usernamePrefix.length < 3) usernamePrefix = defaultUsername;

    const existingUsernames =
      await this.userProfileRepository.findUsernamesByPrefix(usernamePrefix);
    let username = usernamePrefix;

    for (let suffix = 1; existingUsernames.includes(username); suffix++) {
      username = `${usernamePrefix}${suffix}`;
    }

    return username;
  }

  /**
   * Normalizes a name segment for username generation.
   * @param value Name segment.
   * @returns The first three alphanumeric characters.
   */
  private normalizeUsernamePart(value: string): string {
    const unsupportedUsernameCharacters = /[^a-zA-Z0-9]/g;
    const usernamePartLength = 3;

    return value
      .replace(unsupportedUsernameCharacters, '')
      .slice(0, usernamePartLength);
  }

  /**
   * Generates a random profile color in hex format.
   * @returns A hex color string.
   */
  private generateRandomProfileHex(): string {
    return `#${randomBytes(3).toString('hex')}`;
  }

  /**
   * Ensures an update payload contains at least one defined value.
   * @param dto Partial profile update payload.
   * @returns Nothing.
   */
  private validate(dto: UpdateUserProfileDto): void {
    const hasNoDefinedValues = Object.values(dto).every((v) => v === undefined);

    if (hasNoDefinedValues) {
      throw new BadRequestException(Errors.UserProfile.NoUpdateFields);
    }
  }
}
