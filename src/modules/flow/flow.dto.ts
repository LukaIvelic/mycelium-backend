export interface Node {
  data?: {
    label: string;
  };
  id: string;
  label: string;
}

export interface EdgeCommunication {
  averageDurationMs: number;
  count: number;
  id: string;
  lastDurationMs: number;
  lastSeenAt: string;
  method: string;
  path: string;
  protocol: string;
  statusCode: number;
}

export interface EdgeRequestSummary {
  bodySizeKb: number;
  durationMs: number;
  hasBody: boolean;
  headerSizeBytes: number;
  id: string;
  method: string;
  path: string;
  protocol: string;
  spanId: string;
  statusCode: number;
  timestamp: string;
  traceId: string;
}

export interface EdgeRequestDetailSummary {
  bodySizeKb: number;
  hasBody: boolean;
  headerSizeBytes: number;
}

export interface EdgeData {
  communicationCount: number;
  communications: EdgeCommunication[];
  requests: EdgeRequestSummary[];
  sourceLabel: string;
  targetLabel: string;
}

export interface Edge {
  data?: EdgeData;
  id: string;
  source: string;
  target: string;
}

export interface FlowDto {
  nodes: Node[];
  edges: Edge[];
}
