import { Inject, Injectable } from '@nestjs/common';
import { and, eq, getTableColumns, isNull } from 'drizzle-orm';
import { type NewUser, type PublicUser, type User, users } from '@/database';
import { DRIZZLE } from '@/database/database.module';
import type { Database } from '@/database/database.types';

const { passwordHash: _passwordHash, ...publicUserColumns } =
  getTableColumns(users);

/** Data access for the `users` table. */
@Injectable()
export class UserRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  /**
   * Loads a public user row by id, ignoring archived rows.
   * @param id User identifier.
   * @returns The public user row, or `null` when none is active.
   */
  async findActiveById(id: string): Promise<PublicUser | null> {
    const [user] = await this.db
      .select(publicUserColumns)
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
      .returning(publicUserColumns);
    return user;
  }

  /**
   * Updates an existing user row by id.
   * @param id User identifier.
   * @param values Partial user changes.
   * @returns A promise that resolves when the update completes.
   */
  async update(id: string, values: Partial<User>): Promise<void> {
    await this.db.update(users).set(values).where(eq(users.id, id));
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
}
