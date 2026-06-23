import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { ApiKey, Integration } from '@/database';
import type { Database } from '@/database/database.types';
import { Errors } from '@/lib/constants/errors';
import { ApiKeyService } from '../api-key/api-key.service';
import { FlowService } from '../flow/flow.service';
import type { RuntimeSettingsResponse } from '../settings/settings.dto';
import { SettingsService } from '../settings/settings.service';
import type {
  CreateIntegrationDto,
  UpdateIntegrationDto,
} from './integration.dto';
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
  constructor(
    private readonly integrationRepository: IntegrationRepository,
    private readonly apiKeyService: ApiKeyService,
    private readonly flowService: FlowService,
    private readonly settingsService: SettingsService,
  ) {}

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
   * Lists integrations for a project.
   * @param projectId Project identifier.
   * @returns Project integrations.
   */
  findByProjectId(projectId: string): Promise<Integration[]> {
    return this.integrationRepository.findByProjectId(projectId);
  }

  /**
   * Creates a manually managed integration.
   * @param dto Integration creation payload.
   * @returns The created integration.
   */
  async create(dto: CreateIntegrationDto): Promise<Integration> {
    const origin = dto.origin.trim();
    if (!origin) throw new BadRequestException(Errors.Integration.EmptyOrigin);

    const apiKey = await this.apiKeyService.findActiveKeyForProject(
      dto.projectId,
    );
    if (!apiKey) {
      throw new BadRequestException(Errors.Integration.MissingActiveApiKey);
    }

    const normalizedOrigin = this.normalizeOrigin(origin);
    const existing =
      await this.integrationRepository.findByProjectIdAndNormalizedOrigin(
        dto.projectId,
        normalizedOrigin,
      );
    if (existing) throw new ConflictException(Errors.Integration.Conflict);

    const integration = await this.integrationRepository.insert({
      projectId: dto.projectId,
      apiKeyId: apiKey.id,
      origin,
      normalizedOrigin,
      key: dto.key ?? null,
      name: dto.name ?? null,
      version: dto.version ?? null,
      description: dto.description ?? null,
      repository: dto.repository ?? null,
    });

    await this.flowService.syncProjectFlow(integration.projectId);
    return integration;
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
   * Updates a manually managed integration row.
   * @param integration Existing integration.
   * @param dto Partial integration changes.
   * @returns The updated integration.
   */
  async update(
    integration: Integration,
    dto: UpdateIntegrationDto,
  ): Promise<Integration> {
    const values: Partial<Integration> = this.definedValues(dto);
    if (Object.keys(values).length === 0) {
      throw new BadRequestException(Errors.Integration.NoUpdateFields);
    }

    if (values.origin !== undefined) {
      const origin = values.origin.trim();
      if (!origin)
        throw new BadRequestException(Errors.Integration.EmptyOrigin);

      const normalizedOrigin = this.normalizeOrigin(origin);
      const existing =
        await this.integrationRepository.findByProjectIdAndNormalizedOriginExcludingId(
          integration.projectId,
          normalizedOrigin,
          integration.id,
        );
      if (existing) throw new ConflictException(Errors.Integration.Conflict);

      values.origin = origin;
      values.normalizedOrigin = normalizedOrigin;
    }

    const updated = await this.integrationRepository.update(integration.id, {
      ...values,
      updatedAt: new Date(),
    });
    if (!updated) {
      throw new NotFoundException(Errors.Integration.NotFound(integration.id));
    }

    await this.flowService.syncProjectFlow(updated.projectId);
    return updated;
  }

  /**
   * Deletes an integration row and refreshes its project flow snapshot.
   * @param integration Integration to delete.
   */
  async delete(integration: Integration): Promise<void> {
    await this.integrationRepository.delete(integration.id);
    await this.flowService.syncProjectFlow(integration.projectId);
  }

  /**
   * Resolves SDK runtime settings for an API key and service origin.
   * @param apiKey API key sending the request.
   * @param origin Service origin.
   * @returns Project defaults merged with integration overrides when present.
   */
  async findRuntimeSettings(
    apiKey: ApiKey,
    origin: string,
  ): Promise<RuntimeSettingsResponse> {
    const integration = await this.findByProjectIdAndOrigin(
      apiKey.projectId,
      origin,
    );
    return this.settingsService.resolveRuntimeSettings(
      apiKey.projectId,
      integration?.id,
    );
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

  private definedValues<T extends object>(value: T): Partial<T> {
    return Object.fromEntries(
      Object.entries(value).filter(([, item]) => item !== undefined),
    ) as Partial<T>;
  }
}
