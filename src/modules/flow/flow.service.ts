import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { Integration, Log } from '@/database';
import type { Database } from '@/database/database.types';
import { FlowDataService } from './_services/data.service';
import { FlowGraphService } from './_services/graph.service';
import type { Edge, EdgeRequestDetailSummary, FlowDto, Node } from './flow.dto';
import { FlowRepository } from './flow.repository';

/** Reads and persists per-project flow graphs. */
@Injectable()
export class FlowService {
  private readonly emptyNodes: Node[] = [];
  private readonly emptyEdges: Edge[] = [];

  constructor(
    private readonly flowRepository: FlowRepository,
    private readonly flowDataService: FlowDataService,
    private readonly flowGraphService: FlowGraphService,
  ) {}

  /**
   * Persists the current flow state for a project when it changes.
   * @param projectId Project whose flow should be synced.
   * @returns A promise that resolves when the flow is up to date.
   */
  async syncProjectFlow(projectId: string, tx?: Database): Promise<void> {
    const graph = await this.flowDataService.buildProjectFlow(projectId, tx);
    await this.upsertProjectFlow(projectId, graph, tx);
  }

  /**
   * Merges a newly created log into the stored project flow graph.
   * @param log Newly created log record.
   * @param integration Resolved integration that emitted the log.
   * @param callerIntegration Resolved caller integration for the log origin.
   * @param tx Optional transaction handle to join an existing write flow.
   * @returns A promise that resolves when the flow snapshot is updated.
   */
  async syncProjectFlowWithLog(
    log: Log,
    integration?: Integration | null,
    callerIntegration?: Integration | null,
    requestDetail?: EdgeRequestDetailSummary,
    tx?: Database,
  ): Promise<void> {
    const graph = await this.findStoredGraphByProjectId(log.projectId, tx);

    if (this.isLegacyGraph(graph)) {
      const rebuiltGraph = await this.flowDataService.buildProjectFlow(
        log.projectId,
        tx,
      );

      await this.upsertProjectFlow(log.projectId, rebuiltGraph, tx);
      return;
    }

    const nextGraph = this.flowGraphService.mergeLog(
      graph,
      log,
      integration,
      callerIntegration,
      requestDetail,
    );

    await this.upsertProjectFlow(log.projectId, nextGraph, tx);
  }

  /**
   * Loads a project's stored flow graph.
   * @param projectId Project identifier.
   * @returns The stored nodes and edges, or an empty graph when none exists.
   */
  async findByProjectId(projectId: string, tx?: Database): Promise<FlowDto> {
    const graph = await this.findStoredGraphByProjectId(projectId, tx);

    if (!this.isLegacyGraph(graph)) {
      return graph;
    }

    const rebuiltGraph = await this.flowDataService.buildProjectFlow(
      projectId,
      tx,
    );

    await this.upsertProjectFlow(projectId, rebuiltGraph, tx);

    return rebuiltGraph;
  }

  /**
   * Loads a stored graph without doing legacy rebuilds.
   * @param projectId Project identifier.
   * @param tx Optional transaction handle to join an existing read flow.
   * @returns The stored flow graph or an empty graph.
   */
  private async findStoredGraphByProjectId(
    projectId: string,
    tx?: Database,
  ): Promise<FlowDto> {
    const flow = await this.flowRepository.findByProjectId(projectId, tx);

    return {
      nodes: (flow?.nodes as Node[]) ?? this.emptyNodes,
      edges: (flow?.edges as Edge[]) ?? this.emptyEdges,
    };
  }

  /**
   * Detects stored graph snapshots created before edge communication metadata.
   * @param graph Flow graph to inspect.
   * @returns Whether the graph needs to be rebuilt from logs.
   */
  private isLegacyGraph(graph: FlowDto): boolean {
    return graph.edges.some(
      (edge) =>
        !Array.isArray(edge.data?.communications) ||
        !Array.isArray(edge.data?.requests) ||
        edge.data.requests.some(
          (request) =>
            typeof request.hasBody !== 'boolean' ||
            typeof request.headerSizeBytes !== 'number',
        ),
    );
  }

  /**
   * Creates a stable signature for a flow graph.
   * @param graph Flow graph to fingerprint.
   * @returns A SHA-256 signature of the normalized graph.
   */
  private createSignature(graph: FlowDto): string {
    const nodes = graph.nodes.map((node) => node.id).sort();
    const edges = graph.edges.map((edge) => ({
      data: {
        communicationCount: edge.data?.communicationCount ?? 0,
        communications: [...(edge.data?.communications ?? [])]
          .map((communication) => ({
            averageDurationMs: communication.averageDurationMs,
            count: communication.count,
            id: communication.id,
            lastDurationMs: communication.lastDurationMs,
            lastSeenAt: communication.lastSeenAt,
            method: communication.method,
            path: communication.path,
            protocol: communication.protocol,
            statusCode: communication.statusCode,
          }))
          .sort((left, right) => left.id.localeCompare(right.id)),
        requests: [...(edge.data?.requests ?? [])]
          .map((request) => ({
            bodySizeKb: request.bodySizeKb,
            durationMs: request.durationMs,
            hasBody: request.hasBody,
            headerSizeBytes: request.headerSizeBytes,
            id: request.id,
            method: request.method,
            path: request.path,
            protocol: request.protocol,
            spanId: request.spanId,
            statusCode: request.statusCode,
            timestamp: request.timestamp,
            traceId: request.traceId,
          }))
          .sort((left, right) => left.id.localeCompare(right.id)),
        sourceLabel: edge.data?.sourceLabel ?? edge.source,
        targetLabel: edge.data?.targetLabel ?? edge.target,
      },
      source: edge.source,
      target: edge.target,
    }));

    edges.sort((left, right) => {
      const bySource = left.source.localeCompare(right.source);
      if (bySource) return bySource;
      return left.target.localeCompare(right.target);
    });

    const normalizedGraph = {
      nodes: nodes,
      edges: edges,
    };

    const serializedGraph = JSON.stringify(normalizedGraph);

    return createHash('sha256').update(serializedGraph).digest('hex');
  }

  /**
   * Inserts or updates a project's stored flow when the signature changes.
   * @param projectId Project identifier.
   * @param graph Flow graph to persist.
   * @returns A promise that resolves when the flow is stored.
   */
  private async upsertProjectFlow(
    projectId: string,
    graph: FlowDto,
    tx?: Database,
  ): Promise<void> {
    const signature = this.createSignature(graph);

    const existingSignature =
      await this.flowRepository.findSignatureByProjectId(projectId, tx);

    if (existingSignature === signature) return;

    await this.flowRepository.upsert(
      {
        projectId,
        signature,
        nodes: graph.nodes,
        edges: graph.edges,
      },
      tx,
    );
  }
}
