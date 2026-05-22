import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { Integration, Log } from '@/database';
import type { Database } from '@/database/database.types';
import { FlowDataService } from './_services/data.service';
import { FlowGraphService } from './_services/graph.service';
import { Edge, FlowDto, Node } from './flow.dto';
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
    const graph = await this.flowDataService.buildProjectFlow(projectId);
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
    tx?: Database,
  ): Promise<void> {
    const graph = await this.findByProjectId(log.projectId, tx);
    const nextGraph = this.flowGraphService.mergeLog(
      graph,
      log,
      integration,
      callerIntegration,
    );

    await this.upsertProjectFlow(log.projectId, nextGraph, tx);
  }

  /**
   * Loads a project's stored flow graph.
   * @param projectId Project identifier.
   * @returns The stored nodes and edges, or an empty graph when none exists.
   */
  async findByProjectId(projectId: string, tx?: Database): Promise<FlowDto> {
    const flow = await this.flowRepository.findByProjectId(projectId, tx);

    return {
      nodes: (flow?.nodes as Node[]) ?? this.emptyNodes,
      edges: (flow?.edges as Edge[]) ?? this.emptyEdges,
    };
  }

  /**
   * Creates a stable signature for a flow graph.
   * @param graph Flow graph to fingerprint.
   * @returns A SHA-256 signature of the normalized graph.
   */
  private createSignature(graph: FlowDto): string {
    const nodes = graph.nodes.map((node) => node.id).sort();
    const edges = graph.edges.map((edge) => ({
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
