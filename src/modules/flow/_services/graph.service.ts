import { Injectable } from '@nestjs/common';
import type { Integration, Log } from '@/database';
import type { Edge, FlowDto, Node } from '../flow.dto';

type GraphNode = Node;

/** Builds flow graph DTOs from logs and integrations. */
@Injectable()
export class FlowGraphService {
  /**
   * Converts project logs and integrations into a flow graph.
   * @param logs Project logs ordered by timestamp.
   * @param integrationsByOrigin Integration map keyed by normalized origin.
   * @returns The generated flow graph.
   */
  buildGraph(
    logs: Log[],
    integrationsByOrigin: Map<string, Integration>,
  ): FlowDto {
    const nodes = new Map<string, GraphNode>();
    const edges = new Map<string, Edge>();

    this.addIntegrationNodes(nodes, integrationsByOrigin);
    this.addLogTopology(nodes, edges, logs, integrationsByOrigin);

    return {
      nodes: this.sortNodes(nodes.values()),
      edges: this.sortEdges(edges.values()),
    };
  }

  /**
   * Seeds graph nodes from registered integrations.
   * @param nodes Mutable graph node collection.
   * @param integrationsByOrigin Integrations keyed by normalized origin.
   * @returns Nothing.
   */
  private addIntegrationNodes(
    nodes: Map<string, GraphNode>,
    integrationsByOrigin: Map<string, Integration>,
  ): void {
    for (const integration of integrationsByOrigin.values()) {
      const node = this.createIntegrationNode(integration);
      nodes.set(node.id, node);
    }
  }

  /**
   * Builds graph topology from project logs.
   * @param nodes Mutable graph node collection.
   * @param edges Mutable graph edge collection.
   * @param logs Project logs ordered by timestamp.
   * @param integrationsByOrigin Integrations keyed by normalized origin.
   * @returns Nothing.
   */
  private addLogTopology(
    nodes: Map<string, GraphNode>,
    edges: Map<string, Edge>,
    logs: Log[],
    integrationsByOrigin: Map<string, Integration>,
  ): void {
    for (const log of logs) {
      const sourceNode = this.resolveSourceNode(log, integrationsByOrigin);
      nodes.set(sourceNode.id, sourceNode);
      this.addLogTargetEdge(
        nodes,
        edges,
        log,
        sourceNode,
        integrationsByOrigin,
      );
    }
  }

  /**
   * Adds a log-derived edge from a source node to its target origin.
   * @param nodes Mutable graph node collection.
   * @param edges Mutable graph edge collection.
   * @param log Source log record.
   * @param sourceNode Resolved source node for the log.
   * @param integrationsByOrigin Integrations keyed by normalized origin.
   * @returns Nothing.
   */
  private addLogTargetEdge(
    nodes: Map<string, GraphNode>,
    edges: Map<string, Edge>,
    log: Log,
    sourceNode: GraphNode,
    integrationsByOrigin: Map<string, Integration>,
  ): void {
    const sourceOrigin = this.normalizeOrigin(log.integrationOrigin);
    const targetOrigin = this.normalizeOrigin(log.origin);

    if (!this.canCreateTargetEdge(sourceOrigin, targetOrigin)) return;

    const targetNode = this.resolveTargetNode(
      targetOrigin,
      integrationsByOrigin,
    );

    nodes.set(targetNode.id, targetNode);
    this.addEdge(edges, sourceNode.id, targetNode.id);
  }

  /**
   * Resolves the graph node that emitted a given log.
   * @param log Source log record.
   * @param integrationsByOrigin Integrations keyed by normalized origin.
   * @returns The source node to use in the graph.
   */
  private resolveSourceNode(
    log: Log,
    integrationsByOrigin: Map<string, Integration>,
  ): GraphNode {
    const normalizedOrigin = this.normalizeOrigin(log.integrationOrigin);

    if (normalizedOrigin) {
      const integration = integrationsByOrigin.get(normalizedOrigin);
      if (integration) return this.createIntegrationNode(integration);
      return this.createOriginNode(
        normalizedOrigin,
        log.integrationName ?? log.integrationKey,
      );
    }

    return this.createFallbackSourceNode(log);
  }

  /**
   * Resolves the graph node for a target origin.
   * @param normalizedOrigin Normalized target origin.
   * @param integrationsByOrigin Integrations keyed by normalized origin.
   * @returns The target node to use in the graph.
   */
  private resolveTargetNode(
    normalizedOrigin: string,
    integrationsByOrigin: Map<string, Integration>,
  ): GraphNode {
    const integration = integrationsByOrigin.get(normalizedOrigin);
    if (integration) return this.createIntegrationNode(integration);
    return this.createOriginNode(normalizedOrigin);
  }

  /**
   * Checks whether a target edge should be created for two origins.
   * @param sourceOrigin Normalized source origin.
   * @param targetOrigin Normalized target origin.
   * @returns `true` when the edge should be created, otherwise `false`.
   */
  private canCreateTargetEdge(
    sourceOrigin: string,
    targetOrigin: string,
  ): boolean {
    return (
      Boolean(targetOrigin) && (!sourceOrigin || sourceOrigin !== targetOrigin)
    );
  }

  /**
   * Adds a de-duplicated edge between two node identifiers.
   * @param edges Mutable graph edge collection.
   * @param sourceId Source node identifier.
   * @param targetId Target node identifier.
   * @returns Nothing.
   */
  private addEdge(
    edges: Map<string, Edge>,
    sourceId: string,
    targetId: string,
  ): void {
    const edgeId = `${sourceId}->${targetId}`;
    edges.set(edgeId, {
      id: edgeId,
      source: sourceId,
      target: targetId,
    });
  }

  /**
   * Sorts graph nodes by identifier for stable output.
   * @param nodes Node collection to sort.
   * @returns A sorted node array.
   */
  private sortNodes(nodes: Iterable<GraphNode>): Node[] {
    return [...nodes].sort((left, right) => left.id.localeCompare(right.id));
  }

  /**
   * Sorts graph edges by identifier for stable output.
   * @param edges Edge collection to sort.
   * @returns A sorted edge array.
   */
  private sortEdges(edges: Iterable<Edge>): Edge[] {
    return [...edges].sort((left, right) => left.id.localeCompare(right.id));
  }

  /**
   * Builds a graph node from an integration record.
   * @param integration Integration to represent.
   * @returns The integration node.
   */
  private createIntegrationNode(integration: Integration): GraphNode {
    const integrationId = `integration:${integration.id}`;

    return {
      id: integrationId,
      label: integration.name ?? integration.key ?? integration.origin,
    };
  }

  /**
   * Builds a graph node from a normalized origin.
   * @param normalizedOrigin Normalized origin string.
   * @param label Optional label override.
   * @returns The origin node.
   */
  private createOriginNode(
    normalizedOrigin: string,
    label?: string | null,
  ): GraphNode {
    const originId = `origin:${normalizedOrigin}`;
    const originLabel = new URL(normalizedOrigin).host;

    return {
      id: originId,
      label: label ?? originLabel ?? origin,
    };
  }

  /**
   * Builds a fallback source node when no origin-based node can be resolved.
   * @param log Source log record.
   * @returns The fallback source node.
   */
  private createFallbackSourceNode(log: Log): GraphNode {
    const sourceNodeId = `integration-key:${log.integrationKey ?? log.id}`;

    return {
      id: sourceNodeId,
      label: log.integrationName ?? log.integrationKey ?? sourceNodeId,
    };
  }

  /**
   * Normalizes an origin string for map keys and edge comparisons.
   * @param origin Raw origin value.
   * @returns A normalized absolute origin, or an empty string when invalid.
   */
  private normalizeOrigin(origin?: string | null): string {
    const trailingSlashesRegex = /\/+$/;
    const origins = ['http://', 'https://'];
    const isAbsoluteOrigin = origins.some((prefix) =>
      origin?.startsWith(prefix),
    );

    if (!origin || !isAbsoluteOrigin) {
      return '';
    }

    try {
      return new URL(origin).origin.toLowerCase();
    } catch {
      const normalized = origin
        .trim()
        .toLowerCase()
        .replace(trailingSlashesRegex, '');

      return normalized;
    }
  }
}
