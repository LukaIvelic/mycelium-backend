import { Injectable } from '@nestjs/common';
import type { Integration, Log } from '@/database';
import type { Edge, FlowDto, Node } from '../flow.dto';

type GraphNode = Node;
type IntegrationLookup = {
  byId: Map<string, Integration>;
  byOrigin: Map<string, Integration>;
};

/** Builds flow graph DTOs from logs and integrations. */
@Injectable()
export class FlowGraphService {
  /**
   * Converts project logs and integrations into a flow graph.
   * @param logs Project logs ordered by timestamp.
   * @param integrations Integration lookup maps for direct ids and origins.
   * @returns The generated flow graph.
   */
  buildGraph(logs: Log[], integrations: IntegrationLookup): FlowDto {
    const nodes = new Map<string, GraphNode>();
    const edges = new Map<string, Edge>();

    this.addIntegrationNodes(nodes, integrations.byId);
    this.addLogTopology(nodes, edges, logs, integrations);

    return {
      nodes: this.sortNodes(nodes.values()),
      edges: this.sortEdges(edges.values()),
    };
  }

  /**
   * Merges a single log into an existing stored flow graph.
   * @param graph Existing stored flow graph.
   * @param log Newly created log.
   * @param integration Resolved integration that emitted the log.
   * @param callerIntegration Resolved caller integration for the log origin.
   * @returns The updated graph.
   */
  mergeLog(
    graph: FlowDto,
    log: Log,
    integration?: Integration | null,
    callerIntegration?: Integration | null,
  ): FlowDto {
    const nodes = new Map(graph.nodes.map((node) => [node.id, node]));
    const edges = new Map(graph.edges.map((edge) => [edge.id, edge]));

    const sourceNode = this.resolveStoredSourceNode(log, integration);
    nodes.set(sourceNode.id, sourceNode);

    const targetNode = this.resolveStoredTargetNode(log, callerIntegration);
    if (targetNode && sourceNode.id !== targetNode.id) {
      nodes.set(targetNode.id, targetNode);
      this.addEdge(edges, sourceNode.id, targetNode.id);
    }

    return {
      nodes: this.sortNodes(nodes.values()),
      edges: this.sortEdges(edges.values()),
    };
  }

  /**
   * Seeds graph nodes from registered integrations.
   * @param nodes Mutable graph node collection.
   * @param integrationsById Integrations keyed by id.
   * @returns Nothing.
   */
  private addIntegrationNodes(
    nodes: Map<string, GraphNode>,
    integrationsById: Map<string, Integration>,
  ): void {
    for (const integration of integrationsById.values()) {
      const node = this.createIntegrationNode(integration);
      nodes.set(node.id, node);
    }
  }

  /**
   * Builds graph topology from project logs.
   * @param nodes Mutable graph node collection.
   * @param edges Mutable graph edge collection.
   * @param logs Project logs ordered by timestamp.
   * @param integrations Integration lookup maps for direct ids and origins.
   * @returns Nothing.
   */
  private addLogTopology(
    nodes: Map<string, GraphNode>,
    edges: Map<string, Edge>,
    logs: Log[],
    integrations: IntegrationLookup,
  ): void {
    for (const log of logs) {
      const sourceNode = this.resolveSourceNode(log, integrations);
      nodes.set(sourceNode.id, sourceNode);

      const targetNode = this.resolveTargetNode(log, integrations);
      if (!targetNode || sourceNode.id === targetNode.id) continue;

      nodes.set(targetNode.id, targetNode);
      this.addEdge(edges, sourceNode.id, targetNode.id);
    }
  }

  /**
   * Resolves the graph node that emitted a given stored log.
   * @param log Source log record.
   * @param integration Resolved integration that emitted the log.
   * @returns The source node to use in the graph.
   */
  private resolveStoredSourceNode(
    log: Log,
    integration?: Integration | null,
  ): GraphNode {
    if (integration) return this.createIntegrationNode(integration);

    const normalizedOrigin = this.normalizeOrigin(log.integrationOrigin);

    if (normalizedOrigin) {
      return this.createOriginNode(
        normalizedOrigin,
        log.integrationName ?? log.integrationKey,
      );
    }

    return this.createFallbackSourceNode(log);
  }

  /**
   * Resolves the graph node that emitted a given log.
   * @param log Source log record.
   * @param integrations Integration lookup maps for direct ids and origins.
   * @returns The source node to use in the graph.
   */
  private resolveSourceNode(
    log: Log,
    integrations: IntegrationLookup,
  ): GraphNode {
    if (log.integrationId) {
      const integration = integrations.byId.get(log.integrationId);
      if (integration) return this.createIntegrationNode(integration);
    }

    const normalizedOrigin = this.normalizeOrigin(log.integrationOrigin);

    if (normalizedOrigin) {
      const integration = integrations.byOrigin.get(normalizedOrigin);
      if (integration) return this.createIntegrationNode(integration);
      return this.createOriginNode(
        normalizedOrigin,
        log.integrationName ?? log.integrationKey,
      );
    }

    return this.createFallbackSourceNode(log);
  }

  /**
   * Resolves the graph node for a stored log target.
   * @param log Source log record.
   * @param callerIntegration Resolved caller integration for the log origin.
   * @returns The target node to use in the graph, or `null` when none exists.
   */
  private resolveStoredTargetNode(
    log: Log,
    callerIntegration?: Integration | null,
  ): GraphNode | null {
    if (callerIntegration) return this.createIntegrationNode(callerIntegration);

    const normalizedOrigin = this.normalizeOrigin(log.origin);
    if (!normalizedOrigin) return null;

    return this.createOriginNode(normalizedOrigin);
  }

  /**
   * Resolves the graph node for a target origin.
   * @param log Source log record.
   * @param integrations Integration lookup maps for direct ids and origins.
   * @returns The target node to use in the graph, or `null` when none exists.
   */
  private resolveTargetNode(
    log: Log,
    integrations: IntegrationLookup,
  ): GraphNode | null {
    if (log.callerIntegrationId) {
      const integration = integrations.byId.get(log.callerIntegrationId);
      if (integration) return this.createIntegrationNode(integration);
    }

    const normalizedOrigin = this.normalizeOrigin(log.origin);
    if (!normalizedOrigin) return null;

    const integration = integrations.byOrigin.get(normalizedOrigin);
    if (integration) return this.createIntegrationNode(integration);
    return this.createOriginNode(normalizedOrigin);
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
      label: label ?? originLabel ?? normalizedOrigin,
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
