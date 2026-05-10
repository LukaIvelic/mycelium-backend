import { Inject, Injectable } from '@nestjs/common';
import { asc, eq } from 'drizzle-orm';
import { type Integration, integrations, logs } from '@/database';
import { DRIZZLE } from '@/database/database.module';
import type { Database } from '@/database/database.types';
import type { FlowDto } from '../flow.dto';
import { FlowGraphService } from './graph.service';

/** Loads the data needed to build a project's flow graph. */
@Injectable()
export class FlowDataService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly flowGraphService: FlowGraphService,
  ) {}

  /**
   * Loads project logs and integrations, then builds the flow graph.
   * @param projectId Project identifier.
   * @returns The computed flow graph.
   */
  async buildProjectFlow(projectId: string): Promise<FlowDto> {
    const projectLogs = await this.db
      .select()
      .from(logs)
      .where(eq(logs.projectId, projectId))
      .orderBy(asc(logs.timestamp));

    const integrationsByOrigin = await this.findIntegrationsByOrigin(projectId);

    return this.flowGraphService.buildGraph(projectLogs, integrationsByOrigin);
  }

  /**
   * Loads integrations for a project and keys them by normalized origin.
   * @param projectId Project identifier.
   * @returns A map of integrations keyed by normalized origin.
   */
  private async findIntegrationsByOrigin(
    projectId: string,
  ): Promise<Map<string, Integration>> {
    const projectIntegrations = await this.db
      .select()
      .from(integrations)
      .where(eq(integrations.projectId, projectId));

    return new Map(
      projectIntegrations.map((integration) => [
        integration.normalizedOrigin,
        integration,
      ]),
    );
  }
}
