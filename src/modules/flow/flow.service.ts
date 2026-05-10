import { createHash } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { flows } from '@/database';
import { DRIZZLE } from '@/database/database.module';
import type { Database } from '@/database/database.types';
import { FlowDataService } from './_services/data.service';
import { Edge, FlowDto, Node } from './flow.dto';

/** Reads and persists per-project flow graphs. */
@Injectable()
export class FlowService {
  private readonly emptyNodes: Node[] = [];
  private readonly emptyEdges: Edge[] = [];

  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly flowDataService: FlowDataService,
  ) {}

  /**
   * Persists the current flow state for a project when it changes.
   * @param projectId Project whose flow should be synced.
   * @returns A promise that resolves when the flow is up to date.
   */
  async syncProjectFlow(projectId: string): Promise<void> {
    const graph = await this.flowDataService.buildProjectFlow(projectId);
    await this.upsertProjectFlow(projectId, graph);
  }

  /**
   * Loads a project's stored flow graph.
   * @param projectId Project identifier.
   * @returns The stored nodes and edges, or an empty graph when none exists.
   */
  async findByProjectId(projectId: string): Promise<FlowDto> {
    const [graph] = await this.db
      .select()
      .from(flows)
      .where(eq(flows.projectId, projectId));

    return {
      nodes: (graph?.nodes as Node[]) ?? this.emptyNodes,
      edges: (graph?.edges as Edge[]) ?? this.emptyEdges,
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
  ): Promise<void> {
    const signature = this.createSignature(graph);

    const [existingFlow] = await this.db
      .select({
        signature: flows.signature,
      })
      .from(flows)
      .where(eq(flows.projectId, projectId));

    const hasSameSignature = existingFlow?.signature === signature;
    if (hasSameSignature) return;

    const flowValues = {
      projectId: projectId,
      signature: signature,
      nodes: graph.nodes,
      edges: graph.edges,
    };

    await this.db.insert(flows).values(flowValues).onConflictDoUpdate({
      target: flows.projectId,
      set: flowValues,
    });
  }
}
