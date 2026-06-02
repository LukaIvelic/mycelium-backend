import { Inject, Injectable } from '@nestjs/common';
import { eq, like } from 'drizzle-orm';
import {
  type NewUserProfile,
  type UserProfile,
  userProfiles,
} from '@/database';
import { DRIZZLE } from '@/database/database.module';
import type { Database } from '@/database/database.types';

/** Data access for the `user_profile` table. */
@Injectable()
export class UserProfileRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  private filterUndefined<T extends Record<string, unknown>>(
    values: T,
  ): Partial<T> {
    return Object.fromEntries(
      Object.entries(values).filter(([, value]) => value !== undefined),
    ) as Partial<T>;
  }

  /**
   * Loads a user profile by user id.
   * @param userId User identifier.
   * @returns The matching profile, or `null` when none exists.
   */
  async findByUserId(userId: string): Promise<UserProfile | null> {
    const [profile] = await this.db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId));
    return profile ?? null;
  }

  /**
   * Loads all usernames that share a generated prefix.
   * @param usernamePrefix Generated username prefix.
   * @returns Matching usernames.
   */
  async findUsernamesByPrefix(usernamePrefix: string): Promise<string[]> {
    const rows = await this.db
      .select({ username: userProfiles.username })
      .from(userProfiles)
      .where(like(userProfiles.username, `${usernamePrefix}%`));

    return rows.flatMap(({ username }) =>
      typeof username === 'string' ? [username] : [],
    );
  }

  /**
   * Inserts a user profile row.
   * @param values Profile insert payload.
   * @returns The inserted profile.
   */
  async insert(values: NewUserProfile): Promise<UserProfile> {
    const [profile] = await this.db
      .insert(userProfiles)
      .values(values)
      .returning();
    return profile;
  }

  /**
   * Inserts or updates profile fields for a user.
   * @param userId User identifier.
   * @param values Partial profile changes.
   * @returns A promise that resolves when the upsert completes.
   */
  async upsert(
    userId: string,
    values: Partial<
      Pick<
        UserProfile,
        | 'firstName'
        | 'lastName'
        | 'username'
        | 'email'
        | 'bio'
        | 'jobTitle'
        | 'company'
        | 'location'
        | 'avatarUrl'
      >
    >,
  ): Promise<void> {
    const profileValues = this.filterUndefined(values);

    if (Object.keys(profileValues).length === 0) return;

    await this.db
      .insert(userProfiles)
      .values({
        userId,
        firstName: profileValues.firstName ?? null,
        lastName: profileValues.lastName ?? null,
        username: profileValues.username ?? null,
        email: profileValues.email ?? null,
        bio: profileValues.bio ?? null,
        jobTitle: profileValues.jobTitle ?? null,
        company: profileValues.company ?? null,
        location: profileValues.location ?? null,
        avatarUrl: profileValues.avatarUrl ?? null,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: userProfiles.userId,
        set: {
          ...profileValues,
          updatedAt: new Date(),
        },
      });
  }
}
