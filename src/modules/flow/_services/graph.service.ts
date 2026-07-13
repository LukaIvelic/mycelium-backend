import { Injectable } from '@nestjs/common';
import type { Integration, Log } from '@/database';
import type {
  Edge,
  EdgeCommunication,
  EdgeRequestDetailSummary,
  EdgeRequestSummary,
  FlowDto,
  Node,
} from '../flow.dto';

type GraphNode = Node;
type IntegrationLookup = {
  byId: Map<string, Integration>;
  byOrigin: Map<string, Integration>;
};

const EDGE_REQUEST_SUMMARY_LIMIT = 50;

/** Builds flow graph DTOs from logs and integrations. */
@Injectable()
export class FlowGraphService {
  /**
   * Converts project logs and integrations into a flow graph.
   * @param logs Project logs ordered by timestamp.
   * @param integrations Integration lookup maps for direct ids and origins.
   * @returns The generated flow graph.
   */
  buildGraph(
    logs: Log[],
    integrations: IntegrationLookup,
    requestDetails = new Map<string, EdgeRequestDetailSummary>(),
  ): FlowDto {
    const nodes = new Map<string, GraphNode>();
    const edges = new Map<string, Edge>();

    this.addIntegrationNodes(nodes, integrations.byId);
    this.addLogTopology(nodes, edges, logs, integrations, requestDetails);

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
    requestDetail?: EdgeRequestDetailSummary,
  ): FlowDto {
    const nodes = new Map(graph.nodes.map((node) => [node.id, node]));
    const edges = new Map(graph.edges.map((edge) => [edge.id, edge]));

    const sourceNode = this.resolveStoredSourceNode(log, integration);
    nodes.set(sourceNode.id, sourceNode);

    const targetNode = this.resolveStoredTargetNode(log, callerIntegration);
    if (targetNode && sourceNode.id !== targetNode.id) {
      nodes.set(targetNode.id, targetNode);
      this.addEdge(edges, sourceNode, targetNode, log, requestDetail);
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
    requestDetails: Map<string, EdgeRequestDetailSummary>,
  ): void {
    for (const log of logs) {
      const sourceNode = this.resolveSourceNode(log, integrations);
      nodes.set(sourceNode.id, sourceNode);

      const targetNode = this.resolveTargetNode(log, integrations);
      if (!targetNode || sourceNode.id === targetNode.id) continue;

      nodes.set(targetNode.id, targetNode);
      this.addEdge(
        edges,
        sourceNode,
        targetNode,
        log,
        requestDetails.get(log.id),
      );
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
   * Adds a de-duplicated edge between two graph nodes and aggregates the
   * concrete request route observed on that edge.
   * @param edges Mutable graph edge collection.
   * @param sourceNode Source graph node.
   * @param targetNode Target graph node.
   * @param log Log that observed this communication.
   * @param requestDetail Detail summary for the observed request.
   * @returns Nothing.
   */
  private addEdge(
    edges: Map<string, Edge>,
    sourceNode: GraphNode,
    targetNode: GraphNode,
    log: Log,
    requestDetail?: EdgeRequestDetailSummary,
  ): void {
    const edgeId = `${sourceNode.id}->${targetNode.id}`;
    const edge = this.normalizeEdge(
      edges.get(edgeId) ?? {
        id: edgeId,
        source: sourceNode.id,
        target: targetNode.id,
      },
    );

    edge.data = {
      communicationCount: edge.data.communicationCount,
      communications: edge.data.communications,
      requests: edge.data.requests,
      sourceLabel: sourceNode.label,
      targetLabel: targetNode.label,
    };

    this.addCommunication(edge, log);
    this.addRequestSummary(edge, log, requestDetail);
    this.sortCommunications(edge.data.communications);

    edges.set(edgeId, edge);
  }

  /**
   * Normalizes legacy stored edges so new communication metadata can be merged
   * without requiring a database migration for the JSON payload.
   * @param edge Edge loaded from storage or created in memory.
   * @returns An edge with a complete data object.
   */
  private normalizeEdge(
    edge: Edge,
  ): Edge & { data: NonNullable<Edge['data']> } {
    const communications = edge.data?.communications ?? [];
    const requests = edge.data?.requests ?? [];

    return {
      ...edge,
      data: {
        communicationCount:
          edge.data?.communicationCount ??
          this.countCommunications(communications),
        communications,
        requests,
        sourceLabel: edge.data?.sourceLabel ?? edge.source,
        targetLabel: edge.data?.targetLabel ?? edge.target,
      },
    };
  }

  /**
   * Adds or updates one concrete request route inside an edge.
   * @param edge Edge whose metadata should be updated.
   * @param log Log that observed the route.
   * @returns Nothing.
   */
  private addCommunication(
    edge: Edge & { data: NonNullable<Edge['data']> },
    log: Log,
  ): void {
    const communication = this.createCommunication(log);
    const existing = edge.data.communications.find(
      ({ id }) => id === communication.id,
    );

    edge.data.communicationCount += 1;

    if (!existing) {
      edge.data.communications.push(communication);
      return;
    }

    const previousCount = existing.count;
    const nextCount = previousCount + 1;
    const totalDuration =
      existing.averageDurationMs * previousCount + log.durationMs;

    existing.averageDurationMs = Math.round(totalDuration / nextCount);
    existing.count = nextCount;
    existing.lastDurationMs = log.durationMs;
    existing.lastSeenAt = communication.lastSeenAt;
    existing.protocol = communication.protocol;
    existing.statusCode = log.statusCode;
  }

  /**
   * Builds a display-ready aggregate for a single request route.
   * @param log Log that observed the route.
   * @returns Edge communication metadata.
   */
  private createCommunication(log: Log): EdgeCommunication {
    const method = log.method.trim().toUpperCase();
    const path = log.path.trim() || '/';

    return {
      averageDurationMs: log.durationMs,
      count: 1,
      id: `${method} ${path}`,
      lastDurationMs: log.durationMs,
      lastSeenAt: this.serializeTimestamp(log.timestamp),
      method,
      path,
      protocol: log.protocol.trim().toLowerCase(),
      statusCode: log.statusCode,
    };
  }

  /**
   * Adds a single request summary to the edge, keeping only recent requests.
   * @param edge Edge whose request list should be updated.
   * @param log Log that observed the request.
   * @returns Nothing.
   */
  private addRequestSummary(
    edge: Edge & { data: NonNullable<Edge['data']> },
    log: Log,
    requestDetail?: EdgeRequestDetailSummary,
  ): void {
    const requestSummary = this.createRequestSummary(log, requestDetail);
    const otherRequests = edge.data.requests.filter(
      ({ id }) => id !== requestSummary.id,
    );

    edge.data.requests = [requestSummary, ...otherRequests];
    this.sortRequestSummaries(edge.data.requests);

    if (edge.data.requests.length > EDGE_REQUEST_SUMMARY_LIMIT) {
      edge.data.requests.length = EDGE_REQUEST_SUMMARY_LIMIT;
    }
  }

  /**
   * Builds display metadata for one concrete request on an edge.
   * @param log Log that observed the request.
   * @param requestDetail Detail summary for the observed request.
   * @returns Request summary metadata.
   */
  private createRequestSummary(
    log: Log,
    requestDetail?: EdgeRequestDetailSummary,
  ): EdgeRequestSummary {
    const method = log.method.trim().toUpperCase();
    const path = log.path.trim() || '/';

    return {
      bodySizeKb: requestDetail?.bodySizeKb ?? 0,
      durationMs: log.durationMs,
      hasBody: requestDetail?.hasBody ?? false,
      headerSizeBytes: requestDetail?.headerSizeBytes ?? 0,
      id: log.id,
      method,
      path,
      protocol: log.protocol.trim().toLowerCase(),
      spanId: log.spanId,
      statusCode: log.statusCode,
      timestamp: this.serializeTimestamp(log.timestamp),
      traceId: log.traceId,
    };
  }

  /**
   * Counts all observed requests for an edge from its route aggregates.
   * @param communications Route aggregates stored on an edge.
   * @returns Total request count.
   */
  private countCommunications(communications: EdgeCommunication[]): number {
    return communications.reduce((total, { count }) => total + count, 0);
  }

  /**
   * Sorts routes by most recent activity for stable storage and UI display.
   * @param communications Route aggregates to sort.
   * @returns Nothing.
   */
  private sortCommunications(communications: EdgeCommunication[]): void {
    communications.sort((left, right) => {
      const byLastSeen =
        new Date(right.lastSeenAt).getTime() -
        new Date(left.lastSeenAt).getTime();

      if (byLastSeen) return byLastSeen;
      return left.id.localeCompare(right.id);
    });
  }

  /**
   * Sorts request summaries by newest first for stable storage and display.
   * @param requests Request summaries to sort.
   * @returns Nothing.
   */
  private sortRequestSummaries(requests: EdgeRequestSummary[]): void {
    requests.sort((left, right) => {
      const byTimestamp =
        new Date(right.timestamp).getTime() -
        new Date(left.timestamp).getTime();

      if (byTimestamp) return byTimestamp;
      return left.id.localeCompare(right.id);
    });
  }

  /**
   * Serializes a log timestamp into an ISO string.
   * @param timestamp Log timestamp value.
   * @returns ISO timestamp.
   */
  private serializeTimestamp(timestamp: Date): string {
    return timestamp.toISOString();
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
