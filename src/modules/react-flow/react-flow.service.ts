import { createHash } from 'crypto';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Log } from '../log/log.entity';
import { normalizeOrigin } from '../service-registry/normalize-origin';
import { RegisteredService } from '../service-registry/registered-service.entity';
import { ServiceRegistryService } from '../service-registry/service-registry.service';
import {
  ReactFlowDto,
  ReactFlowEdgeDto,
  ReactFlowNodeDto,
} from './react-flow.dto';
import { ReactFlow } from './react-flow.entity';

type GraphNode = {
  id: string;
  label: string;
};

type GraphRepositories = {
  logRepository: Repository<Log>;
  reactFlowRepository: Repository<ReactFlow>;
};

@Injectable()
export class ReactFlowService {
  constructor(
    @InjectRepository(ReactFlow)
    private readonly reactFlowRepository: Repository<ReactFlow>,
    @InjectRepository(Log)
    private readonly logRepository: Repository<Log>,
    private readonly serviceRegistryService: ServiceRegistryService,
  ) {}

  async findByProject(projectId: string): Promise<ReactFlowDto> {
    const graph = await this.reactFlowRepository.findOneBy({
      project_id: projectId,
    });

    if (!graph) {
      return {
        nodes: [],
        edges: [],
      };
    }

    return {
      nodes: graph.nodes,
      edges: graph.edges,
    };
  }

  async syncProjectGraph(
    projectId: string,
    manager?: EntityManager,
  ): Promise<void> {
    const { logRepository, reactFlowRepository } =
      this.resolveRepositories(manager);
    const logs = await this.findProjectLogs(logRepository, projectId);
    const servicesByOrigin = await this.findServicesByOrigin(projectId, manager);
    const graph = this.buildGraph(logs, servicesByOrigin);
    await this.upsertProjectGraph(reactFlowRepository, projectId, graph);
  }

  private buildGraph(
    logs: Log[],
    servicesByOrigin: Map<string, RegisteredService>,
  ): ReactFlowDto {
    const nodes = new Map<string, GraphNode>();
    const edges = new Map<string, ReactFlowEdgeDto>();

    this.addRegisteredServiceNodes(nodes, servicesByOrigin);
    this.addLogTopology(nodes, edges, logs, servicesByOrigin);

    const sortedEdges = this.sortEdges(edges.values());
    const laidOutNodes = this.layoutNodes([...nodes.values()], sortedEdges);

    return {
      nodes: laidOutNodes,
      edges: sortedEdges,
    };
  }

  private createSignature(graph: ReactFlowDto): string {
    const normalized = JSON.stringify({
      nodes: graph.nodes.map((node) => node.id).sort(),
      edges: graph.edges
        .map((edge) => ({ source: edge.source, target: edge.target }))
        .sort((left, right) => {
          const sourceCompare = left.source.localeCompare(right.source);
          return sourceCompare !== 0
            ? sourceCompare
            : left.target.localeCompare(right.target);
        }),
    });

    return createHash('sha256').update(normalized).digest('hex');
  }

  private layoutNodes(
    nodes: GraphNode[],
    edges: ReactFlowEdgeDto[],
  ): ReactFlowNodeDto[] {
    const orderedNodeIds = this.sortNodeIds(nodes);
    const labelsByNodeId = this.createLabelsByNodeId(nodes);
    const adjacencyByNodeId = this.createAdjacencyByNodeId(orderedNodeIds);
    const inDegreeByNodeId = this.createInDegreeByNodeId(orderedNodeIds);

    this.populateAdjacency(adjacencyByNodeId, inDegreeByNodeId, edges);

    const rootNodeIds = this.findRootNodeIds(orderedNodeIds, inDegreeByNodeId);
    const depthByNodeId = this.calculateDepthByNodeId(
      adjacencyByNodeId,
      inDegreeByNodeId,
      rootNodeIds,
    );
    const nodeIdsByColumn = this.groupNodeIdsByColumn(
      orderedNodeIds,
      depthByNodeId,
    );

    return this.createPositionedNodes(nodeIdsByColumn, labelsByNodeId);
  }

  private resolveRepositories(manager?: EntityManager): GraphRepositories {
    return {
      logRepository: manager ? manager.getRepository(Log) : this.logRepository,
      reactFlowRepository: manager
        ? manager.getRepository(ReactFlow)
        : this.reactFlowRepository,
    };
  }

  private async findProjectLogs(
    logRepository: Repository<Log>,
    projectId: string,
  ): Promise<Log[]> {
    return logRepository.find({
      where: { project_id: projectId },
      order: { timestamp: 'ASC' },
    });
  }

  private async findServicesByOrigin(
    projectId: string,
    manager?: EntityManager,
  ): Promise<Map<string, RegisteredService>> {
    const registeredServices =
      await this.serviceRegistryService.findByProjectId(projectId, manager);

    return new Map(
      registeredServices.map((service) => [service.normalized_origin, service]),
    );
  }

  private async upsertProjectGraph(
    reactFlowRepository: Repository<ReactFlow>,
    projectId: string,
    graph: ReactFlowDto,
  ): Promise<void> {
    const signature = this.createSignature(graph);
    const existing = await reactFlowRepository.findOneBy({
      project_id: projectId,
    });

    if (existing?.signature === signature) {
      return;
    }

    await reactFlowRepository.upsert(
      {
        project_id: projectId,
        signature,
        nodes: graph.nodes,
        edges: graph.edges,
      },
      ['project_id'],
    );
  }

  private addRegisteredServiceNodes(
    nodes: Map<string, GraphNode>,
    servicesByOrigin: Map<string, RegisteredService>,
  ): void {
    for (const service of servicesByOrigin.values()) {
      const node = this.resolveRegisteredServiceNode(service);
      nodes.set(node.id, node);
    }
  }

  private addLogTopology(
    nodes: Map<string, GraphNode>,
    edges: Map<string, ReactFlowEdgeDto>,
    logs: Log[],
    servicesByOrigin: Map<string, RegisteredService>,
  ): void {
    for (const log of logs) {
      const sourceNode = this.resolveSourceNode(log, servicesByOrigin);
      nodes.set(sourceNode.id, sourceNode);
      this.addLogTargetEdge(nodes, edges, log, sourceNode, servicesByOrigin);
    }
  }

  private addLogTargetEdge(
    nodes: Map<string, GraphNode>,
    edges: Map<string, ReactFlowEdgeDto>,
    log: Log,
    sourceNode: GraphNode,
    servicesByOrigin: Map<string, RegisteredService>,
  ): void {
    const sourceOrigin = this.getNormalizedServiceOrigin(log);
    const targetOrigin = this.getNormalizedTargetOrigin(log);

    if (!this.canCreateTargetEdge(sourceOrigin, targetOrigin)) {
      return;
    }

    const targetNode = this.resolveTargetNode(targetOrigin, servicesByOrigin);
    nodes.set(targetNode.id, targetNode);
    this.addEdge(edges, sourceNode.id, targetNode.id);
  }

  private getNormalizedServiceOrigin(log: Log): string {
    return normalizeOrigin(log.service_origin ?? '');
  }

  private getNormalizedTargetOrigin(log: Log): string {
    return normalizeOrigin(log.origin);
  }

  private canCreateTargetEdge(
    sourceOrigin: string,
    targetOrigin: string,
  ): boolean {
    return (
      Boolean(targetOrigin) &&
      this.isAbsoluteOrigin(targetOrigin) &&
      (!sourceOrigin || sourceOrigin !== targetOrigin)
    );
  }

  private addEdge(
    edges: Map<string, ReactFlowEdgeDto>,
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

  private sortEdges(edges: Iterable<ReactFlowEdgeDto>): ReactFlowEdgeDto[] {
    return [...edges].sort((left, right) => left.id.localeCompare(right.id));
  }

  private sortNodeIds(nodes: GraphNode[]): string[] {
    return nodes
      .map((node) => node.id)
      .sort((left, right) => left.localeCompare(right));
  }

  private createLabelsByNodeId(nodes: GraphNode[]): Map<string, string> {
    return new Map(nodes.map((node) => [node.id, node.label]));
  }

  private createAdjacencyByNodeId(nodeIds: string[]): Map<string, Set<string>> {
    const adjacencyByNodeId = new Map<string, Set<string>>();

    for (const nodeId of nodeIds) {
      adjacencyByNodeId.set(nodeId, new Set());
    }

    return adjacencyByNodeId;
  }

  private createInDegreeByNodeId(nodeIds: string[]): Map<string, number> {
    return new Map(nodeIds.map((nodeId) => [nodeId, 0]));
  }

  private populateAdjacency(
    adjacencyByNodeId: Map<string, Set<string>>,
    inDegreeByNodeId: Map<string, number>,
    edges: ReactFlowEdgeDto[],
  ): void {
    for (const edge of edges) {
      const neighbors = adjacencyByNodeId.get(edge.source);
      if (!neighbors || neighbors.has(edge.target)) {
        continue;
      }

      neighbors.add(edge.target);
      inDegreeByNodeId.set(
        edge.target,
        (inDegreeByNodeId.get(edge.target) ?? 0) + 1,
      );
    }
  }

  private findRootNodeIds(
    orderedNodeIds: string[],
    inDegreeByNodeId: Map<string, number>,
  ): string[] {
    const rootNodeIds = orderedNodeIds.filter(
      (nodeId) => (inDegreeByNodeId.get(nodeId) ?? 0) === 0,
    );

    if (rootNodeIds.length === 0 && orderedNodeIds.length > 0) {
      return [orderedNodeIds[0]];
    }

    return rootNodeIds;
  }

  private calculateDepthByNodeId(
    adjacencyByNodeId: Map<string, Set<string>>,
    inDegreeByNodeId: Map<string, number>,
    rootNodeIds: string[],
  ): Map<string, number> {
    const depthByNodeId = new Map<string, number>();
    const queue = [...rootNodeIds];

    for (const nodeId of rootNodeIds) {
      depthByNodeId.set(nodeId, 0);
    }

    let index = 0;
    while (index < queue.length) {
      const currentNodeId = queue[index++];
      const currentDepth = depthByNodeId.get(currentNodeId) ?? 0;

      for (const neighborNodeId of adjacencyByNodeId.get(currentNodeId) ?? []) {
        const nextDepth = currentDepth + 1;
        if (
          !depthByNodeId.has(neighborNodeId) ||
          nextDepth > (depthByNodeId.get(neighborNodeId) ?? 0)
        ) {
          depthByNodeId.set(neighborNodeId, nextDepth);
        }

        const nextInDegree = (inDegreeByNodeId.get(neighborNodeId) ?? 0) - 1;
        inDegreeByNodeId.set(neighborNodeId, nextInDegree);
        if (nextInDegree === 0) {
          queue.push(neighborNodeId);
        }
      }
    }

    return depthByNodeId;
  }

  private groupNodeIdsByColumn(
    orderedNodeIds: string[],
    depthByNodeId: Map<string, number>,
  ): Map<number, string[]> {
    const nodeIdsByColumn = new Map<number, string[]>();

    for (const nodeId of orderedNodeIds) {
      const column = depthByNodeId.get(nodeId) ?? 0;
      const nodeIds = nodeIdsByColumn.get(column) ?? [];
      nodeIds.push(nodeId);
      nodeIdsByColumn.set(column, nodeIds);
    }

    return nodeIdsByColumn;
  }

  private createPositionedNodes(
    nodeIdsByColumn: Map<number, string[]>,
    labelsByNodeId: Map<string, string>,
  ): ReactFlowNodeDto[] {
    return [...nodeIdsByColumn.entries()]
      .sort((left, right) => left[0] - right[0])
      .flatMap(([column, nodeIds]) =>
        nodeIds
          .sort((left, right) => left.localeCompare(right))
          .map((nodeId, row) => ({
            id: nodeId,
            position: {
              x: column * 280,
              y: row * 140,
            },
            data: {
              label: labelsByNodeId.get(nodeId) ?? nodeId,
            },
          })),
      );
  }

  private resolveSourceNode(
    log: Log,
    servicesByOrigin: Map<string, RegisteredService>,
  ): GraphNode {
    const normalizedOrigin = normalizeOrigin(log.service_origin ?? '');
    const registeredService = normalizedOrigin
      ? servicesByOrigin.get(normalizedOrigin)
      : undefined;

    if (registeredService) {
      return this.resolveRegisteredServiceNode(registeredService);
    }

    return this.createUnregisteredSourceNode(log, normalizedOrigin);
  }

  private resolveTargetNode(
    normalizedOrigin: string,
    servicesByOrigin: Map<string, RegisteredService>,
  ): GraphNode {
    const registeredService = servicesByOrigin.get(normalizedOrigin);
    if (registeredService) {
      return this.resolveRegisteredServiceNode(registeredService);
    }

    return this.createOriginNode(normalizedOrigin);
  }

  private createUnregisteredSourceNode(
    log: Log,
    normalizedOrigin: string,
  ): GraphNode {
    return {
      id:
        log.service_key?.trim() ||
        log.service_name?.trim() ||
        normalizedOrigin ||
        'unknown-service',
      label:
        log.service_name?.trim() ||
        log.service_key?.trim() ||
        normalizedOrigin ||
        'Unknown service',
    };
  }

  private createOriginNode(normalizedOrigin: string): GraphNode {
    return {
      id: `origin:${normalizedOrigin}`,
      label: normalizedOrigin,
    };
  }

  private resolveRegisteredServiceNode(service: RegisteredService): GraphNode {
    return {
      id: `service:${service.id}`,
      label:
        service.service_name?.trim() ||
        service.service_key?.trim() ||
        service.service_origin.trim(),
    };
  }

  private isAbsoluteOrigin(origin: string): boolean {
    return origin.startsWith('http://') || origin.startsWith('https://');
  }
}
