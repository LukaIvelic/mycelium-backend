import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
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
}
