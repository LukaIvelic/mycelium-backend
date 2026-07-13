import { Injectable } from '@nestjs/common';
import type { Integration } from '@/database';
import type { Database } from '@/database/database.types';
import type { EdgeRequestDetailSummary, FlowDto } from '../flow.dto';
import {
  type FlowLogDetailSummaryRow,
  FlowRepository,
} from '../flow.repository';
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
  async buildProjectFlow(projectId: string, tx?: Database): Promise<FlowDto> {
    const projectLogs = await this.flowRepository.findProjectLogsOrderedAsc(
      projectId,
      tx,
    );

    const integrations = await this.findIntegrations(projectId, tx);
    const requestDetails = await this.findRequestDetails(projectId, tx);

    return this.flowGraphService.buildGraph(
      projectLogs,
      integrations,
      requestDetails,
    );
  }

  /**
   * Loads integrations for a project and builds lookup maps.
   * @param projectId Project identifier.
   * @returns Integration lookup maps keyed by id and normalized origin.
   */
  private async findIntegrations(
    projectId: string,
    tx?: Database,
  ): Promise<{
    byId: Map<string, Integration>;
    byOrigin: Map<string, Integration>;
  }> {
    const projectIntegrations =
      await this.flowRepository.findProjectIntegrations(projectId, tx);

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

  /**
   * Loads compact request detail metadata keyed by parent log id.
   * @param projectId Project identifier.
   * @param tx Optional transaction handle to join an existing read flow.
   * @returns Request detail lookup.
   */
  private async findRequestDetails(
    projectId: string,
    tx?: Database,
  ): Promise<Map<string, EdgeRequestDetailSummary>> {
    const detailRows = await this.flowRepository.findProjectLogDetailSummaries(
      projectId,
      tx,
    );

    return new Map(detailRows.map(createRequestDetailEntry));
  }
}

function createRequestDetailEntry(
  row: FlowLogDetailSummaryRow,
): [string, EdgeRequestDetailSummary] {
  return [
    row.logId,
    {
      bodySizeKb: row.bodySizeKb,
      hasBody: Boolean(row.body),
      headerSizeBytes: getSerializedByteSize(row.headers ?? {}),
    },
  ];
}

function getSerializedByteSize(value: unknown): number {
  return Buffer.byteLength(JSON.stringify(value), 'utf8');
}
