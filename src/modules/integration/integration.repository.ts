import { Inject, Injectable } from '@nestjs/common';
import { and, eq, ne } from 'drizzle-orm';
import {
  type Integration,
  integrations,
  type NewIntegration,
} from '@/database';
import { DRIZZLE } from '@/database/database.module';
import type { Database } from '@/database/database.types';

/** Data access for the `integration` table. */
@Injectable()
export class IntegrationRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  /**
   * Inserts or updates an integration keyed by project and normalized origin.
   * @param insertValues Row to insert when no conflict exists.
   * @param updateValues Fields to apply on conflict.
   * @param tx Optional transaction handle to join an existing write flow.
   * @returns The inserted or updated integration record.
   */
  async upsert(
    insertValues: NewIntegration,
    updateValues: Partial<Integration>,
    tx?: Database,
  ): Promise<Integration> {
    const [integration] = await (tx ?? this.db)
      .insert(integrations)
      .values(insertValues)
      .onConflictDoUpdate({
        target: [integrations.projectId, integrations.normalizedOrigin],
        set: updateValues,
      })
      .returning();
    return integration;
  }

  /**
   * Inserts a manually managed integration row.
   * @param values Integration insert payload.
   * @returns The inserted integration.
   */
  async insert(values: NewIntegration): Promise<Integration> {
    const [integration] = await this.db
      .insert(integrations)
      .values(values)
      .returning();
    return integration;
  }

  /**
   * Lists integrations for a project.
   * @param projectId Project identifier.
   * @returns Project integrations.
   */
  async findByProjectId(projectId: string): Promise<Integration[]> {
    return this.db
      .select()
      .from(integrations)
      .where(eq(integrations.projectId, projectId));
  }

  /**
   * Loads an integration for a project by its normalized origin.
   * @param projectId Project identifier.
   * @param normalizedOrigin Normalized integration origin.
   * @param tx Optional transaction handle to join an existing flow.
   * @returns The matching integration, or `null` when none exists.
   */
  async findByProjectIdAndNormalizedOrigin(
    projectId: string,
    normalizedOrigin: string,
    tx?: Database,
  ): Promise<Integration | null> {
    const [integration] = await (tx ?? this.db)
      .select()
      .from(integrations)
      .where(
        and(
          eq(integrations.projectId, projectId),
          eq(integrations.normalizedOrigin, normalizedOrigin),
        ),
      );

    return integration ?? null;
  }

  /**
   * Loads an integration by normalized origin while excluding one integration id.
   * @param projectId Project identifier.
   * @param normalizedOrigin Normalized integration origin.
   * @param excludedId Integration id to ignore.
   * @returns A conflicting integration, or `null` when none exists.
   */
  async findByProjectIdAndNormalizedOriginExcludingId(
    projectId: string,
    normalizedOrigin: string,
    excludedId: string,
  ): Promise<Integration | null> {
    const [integration] = await this.db
      .select()
      .from(integrations)
      .where(
        and(
          eq(integrations.projectId, projectId),
          eq(integrations.normalizedOrigin, normalizedOrigin),
          ne(integrations.id, excludedId),
        ),
      );

    return integration ?? null;
  }

  /**
   * Loads an integration by its identifier.
   * @param id Integration identifier.
   * @returns The matching integration, or `null` when not found.
   */
  async findById(id: string): Promise<Integration | null> {
    const [integration] = await this.db
      .select()
      .from(integrations)
      .where(eq(integrations.id, id));

    return integration ?? null;
  }

  /**
   * Updates an integration row.
   * @param id Integration identifier.
   * @param values Partial integration changes.
   * @returns The updated integration, or `null` when not found.
   */
  async update(
    id: string,
    values: Partial<Integration>,
  ): Promise<Integration | null> {
    const [integration] = await this.db
      .update(integrations)
      .set(values)
      .where(eq(integrations.id, id))
      .returning();

    return integration ?? null;
  }

  /**
   * Deletes an integration row.
   * @param id Integration identifier.
   * @returns A promise that resolves when the delete completes.
   */
  async delete(id: string): Promise<void> {
    await this.db.delete(integrations).where(eq(integrations.id, id));
  }
}
