import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, getTableColumns, isNull, sql } from 'drizzle-orm';
import {
  type ApiKey,
  apiKeys,
  type NewApiKey,
  type Project,
  type PublicApiKey,
  projects,
} from '@/database';
import { DRIZZLE } from '@/database/database.module';
import type { Database } from '@/database/database.types';

const { keyHash: _keyHash, ...publicApiKeyColumns } = getTableColumns(apiKeys);

/** Data access for the `api_key` table. */
@Injectable()
export class ApiKeyRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  /**
   * Loads an active API key by hashed value.
   * @param hash Hashed API key value.
   * @returns The matching active API key, or `null` when not found.
   */
  async findActiveByHash(hash: string): Promise<ApiKey | null> {
    const [key] = await this.db
      .select()
      .from(apiKeys)
      .where(and(eq(apiKeys.keyHash, hash), isNull(apiKeys.revokedAt)));
    return key ?? null;
  }

  /**
   * Loads the active API key for a project, if any.
   * @param projectId Project identifier.
   * @returns The matching active API key, or `null` when none exists.
   */
  async findActiveByProjectId(projectId: string): Promise<ApiKey | null> {
    const [key] = await this.db
      .select()
      .from(apiKeys)
      .where(and(eq(apiKeys.projectId, projectId), isNull(apiKeys.revokedAt)));
    return key ?? null;
  }

  /**
   * Lists hashes of every active API key in the database.
   * @returns Hashed values for the bloom filter rebuild.
   */
  async findAllActiveHashes(): Promise<string[]> {
    const rows = await this.db
      .select({ keyHash: apiKeys.keyHash })
      .from(apiKeys)
      .where(isNull(apiKeys.revokedAt));
    return rows.map((row) => row.keyHash);
  }

  /**
   * Inserts a new API key row.
   * @param values API key insert payload.
   * @returns The persisted public API key row.
   */
  async insert(values: NewApiKey): Promise<PublicApiKey> {
    const [entity] = await this.db
      .insert(apiKeys)
      .values(values)
      .returning(publicApiKeyColumns);
    return entity;
  }

  /**
   * Loads an active API key joined with its owning user id.
   * @param apiKeyId API key identifier.
   * @returns The API key and owner id, or `null` when no active key matches.
   */
  async findActiveWithOwner(
    apiKeyId: string,
  ): Promise<{ apiKey: ApiKey; ownerId: string } | null> {
    const [row] = await this.db
      .select({ apiKey: apiKeys, ownerId: projects.userId })
      .from(apiKeys)
      .innerJoin(projects, eq(apiKeys.projectId, projects.id))
      .where(and(eq(apiKeys.id, apiKeyId), isNull(apiKeys.revokedAt)));
    return row ?? null;
  }

  /**
   * Revokes an API key by stamping its revoked and valid-to dates.
   * @param apiKeyId API key identifier.
   * @param when Timestamp to record for both fields.
   * @returns A promise that resolves when the revocation completes.
   */
  async revoke(apiKeyId: string, when: Date): Promise<void> {
    await this.db
      .update(apiKeys)
      .set({ revokedAt: when, validTo: when })
      .where(eq(apiKeys.id, apiKeyId));
  }

  /**
   * Loads the project attached to an API key.
   * @param apiKeyId API key identifier.
   * @returns The owning project, or `null` when the API key is unknown.
   */
  async findProjectById(apiKeyId: string): Promise<Project | null> {
    const [row] = await this.db
      .select({ project: projects })
      .from(apiKeys)
      .innerJoin(projects, eq(apiKeys.projectId, projects.id))
      .where(eq(apiKeys.id, apiKeyId));
    return row?.project ?? null;
  }

  /**
   * Lists active public API keys for projects owned by a user.
   * @param userId Owner identifier.
   * @returns Public API key rows ordered by creation time.
   */
  async findPublicActiveByUserId(userId: string): Promise<PublicApiKey[]> {
    const rows = await this.db
      .select({ apiKey: publicApiKeyColumns })
      .from(apiKeys)
      .innerJoin(projects, eq(apiKeys.projectId, projects.id))
      .where(and(eq(projects.userId, userId), isNull(apiKeys.revokedAt)))
      .orderBy(desc(apiKeys.createdAt));
    return rows.map((row) => row.apiKey);
  }

  /**
   * Counts active API keys for a project.
   * @param projectId Project identifier.
   * @returns The number of active keys.
   */
  async countActiveByProjectId(projectId: string): Promise<number> {
    const [row] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(apiKeys)
      .where(and(eq(apiKeys.projectId, projectId), isNull(apiKeys.revokedAt)));
    return row?.count ?? 0;
  }

  /**
   * Counts active API keys across every project owned by a user.
   * @param userId Owner identifier.
   * @returns The number of active keys.
   */
  async countActiveByUserId(userId: string): Promise<number> {
    const [row] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(apiKeys)
      .innerJoin(projects, eq(apiKeys.projectId, projects.id))
      .where(and(eq(projects.userId, userId), isNull(apiKeys.revokedAt)));
    return row?.count ?? 0;
  }
}
