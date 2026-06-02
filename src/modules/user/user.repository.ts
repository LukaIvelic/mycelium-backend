import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { type NewUser, type User, users } from '@/database';
import { DRIZZLE } from '@/database/database.module';
import type { Database } from '@/database/database.types';
import type { PublicUser, UserUpdateValues } from './user.mapper';

/** Data access for the `users` table. */
@Injectable()
export class UserRepository {
  private readonly publicUserColumns = {
    id: users.id,
    email: users.email,
    createdAt: users.createdAt,
    validTo: users.validTo,
  };

  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  /**
   * Loads a public user row by id, ignoring archived rows.
   * @param id User identifier.
   * @returns The public user row, or `null` when none is active.
   */
  async findActiveById(id: string): Promise<PublicUser | null> {
    const [user] = await this.db
      .select(this.publicUserColumns)
      .from(users)
      .where(and(eq(users.id, id), isNull(users.validTo)));
    return user ?? null;
  }

  /**
   * Loads a full user row by email, ignoring archived rows.
   * @param email User email address.
   * @returns The full user row, or `null` when none is active.
   */
  async findActiveByEmail(email: string): Promise<User | null> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(and(eq(users.email, email), isNull(users.validTo)));
    return user ?? null;
  }

  /**
   * Inserts a new user row.
   * @param values User insert payload.
   * @returns The inserted public user row.
   */
  async insert(values: NewUser): Promise<PublicUser> {
    const [user] = await this.db
      .insert(users)
      .values(values)
      .returning(this.publicUserColumns);
    return user;
  }

  /**
   * Updates an existing user row by id.
   * @param id User identifier.
   * @param values Partial user changes.
   * @returns A promise that resolves when the update completes.
   */
  async update(id: string, values: UserUpdateValues): Promise<void> {
    const userValues = this.filterUndefined(values);
    const hasValuesToUpdate = Object.keys(userValues).length !== 0;

    if (!hasValuesToUpdate) return;

    await this.db.update(users).set(userValues).where(eq(users.id, id));
  }

  /**
   * Soft deletes a user by setting its validity end date.
   * @param id User identifier.
   * @returns A promise that resolves when the user is archived.
   */
  async softDelete(id: string): Promise<void> {
    await this.db
      .update(users)
      .set({ validTo: new Date() })
      .where(eq(users.id, id));
  }

  private filterUndefined<T extends Record<string, unknown>>(
    values: T,
  ): Partial<T> {
    const entries = Object.entries(values);
    const filteredEntries = entries.filter(([, value]) => value !== undefined);
    return Object.fromEntries(filteredEntries) as Partial<T>;
  }
}
