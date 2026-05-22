import { Injectable, NotFoundException } from '@nestjs/common';
import type { Integration } from '@/database';
import type { Database } from '@/database/database.types';
import { Errors } from '@/lib/constants/errors';
import { IntegrationRepository } from './integration.repository';

interface IntegrationMetadata {
  integrationOrigin?: string | null;
  integrationKey?: string | null;
  integrationName?: string | null;
  integrationVersion?: string | null;
  integrationDescription?: string | null;
  integrationRepository?: string | null;
}

/** Loads integration records from the database. */
@Injectable()
export class IntegrationService {
  constructor(private readonly integrationRepository: IntegrationRepository) {}

  /**
   * Inserts or updates an integration derived from log metadata.
   * @param projectId Project that owns the integration.
   * @param apiKeyId API key that observed the integration.
   * @param metadata Integration metadata extracted from a log payload.
   * @param tx Optional transaction handle to join an existing write flow.
   * @returns The inserted or updated integration record.
   */
  async upsertFromLog(
    projectId: string,
    apiKeyId: string,
    metadata: IntegrationMetadata,
    tx?: Database,
  ): Promise<Integration | null> {
    const origin = metadata.integrationOrigin?.trim();
    if (!origin) return null;

    const normalizedOrigin = this.normalizeOrigin(origin);
    const now = new Date();

    const sharedValues = {
      apiKeyId,
      origin,
      key: metadata.integrationKey ?? null,
      name: metadata.integrationName ?? null,
      version: metadata.integrationVersion ?? null,
      description: metadata.integrationDescription ?? null,
      repository: metadata.integrationRepository ?? null,
      updatedAt: now,
    };

    return this.integrationRepository.upsert(
      {
        projectId,
        normalizedOrigin,
        ...sharedValues,
      },
      sharedValues,
      tx,
    );
  }

  /**
   * Finds an integration for a project by origin using the existing normalization rules.
   * @param projectId Project identifier.
   * @param origin Raw origin to resolve.
   * @param tx Optional transaction handle to join an existing flow.
   * @returns The matching integration, or `null` when none exists.
   */
  async findByProjectIdAndOrigin(
    projectId: string,
    origin: string,
    tx?: Database,
  ): Promise<Integration | null> {
    const trimmedOrigin = origin.trim();
    if (!trimmedOrigin) return null;

    const normalizedOrigin = this.normalizeOrigin(trimmedOrigin);
    return this.integrationRepository.findByProjectIdAndNormalizedOrigin(
      projectId,
      normalizedOrigin,
      tx,
    );
  }

  /**
   * Finds an integration by its identifier.
   * @param id Integration identifier.
   * @returns The matching integration record.
   */
  async findById(id: string): Promise<Integration> {
    const integration = await this.integrationRepository.findById(id);
    if (!integration) {
      throw new NotFoundException(Errors.Integration.NotFound(id));
    }
    return integration;
  }

  /**
   * Normalizes an integration origin for stable uniqueness checks.
   * @param origin Raw integration origin.
   * @returns A normalized origin string.
   */
  private normalizeOrigin(origin: string): string {
    const trailingSlashesRegex = /\/+$/;

    try {
      return new URL(origin).origin.toLowerCase();
    } catch {
      return origin.trim().toLowerCase().replace(trailingSlashesRegex, '');
    }
  }
}
