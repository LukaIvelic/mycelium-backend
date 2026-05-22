import { Injectable } from '@nestjs/common';
import type { Integration } from '@/database';
import type { FlowDto } from '../flow.dto';
import { FlowRepository } from '../flow.repository';
import { FlowGraphService } from './graph.service';

/** Loads the data needed to build a project's flow graph. */
@Injectable()
export class FlowDataService {
  constructor(
    private readonly flowRepository: FlowRepository,
    private readonly flowGraphService: FlowGraphService,
  ) {}

  /**
   * Loads project logs and integrations, then builds the flow graph.
   * @param projectId Project identifier.
   * @returns The computed flow graph.
   */
  async buildProjectFlow(projectId: string): Promise<FlowDto> {
    const projectLogs =
      await this.flowRepository.findProjectLogsOrderedAsc(projectId);

    const integrations = await this.findIntegrations(projectId);

    return this.flowGraphService.buildGraph(projectLogs, integrations);
  }

  /**
   * Loads integrations for a project and builds lookup maps.
   * @param projectId Project identifier.
   * @returns Integration lookup maps keyed by id and normalized origin.
   */
  private async findIntegrations(projectId: string): Promise<{
    byId: Map<string, Integration>;
    byOrigin: Map<string, Integration>;
  }> {
    const projectIntegrations =
      await this.flowRepository.findProjectIntegrations(projectId);

    return {
      byId: new Map(
        projectIntegrations.map((integration) => [integration.id, integration]),
      ),
      byOrigin: new Map(
        projectIntegrations.map((integration) => [
          integration.normalizedOrigin,
          integration,
        ]),
      ),
    };
  }
}
