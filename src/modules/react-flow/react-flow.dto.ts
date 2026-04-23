export interface ReactFlowNodeDto {
  id: string;
  position: {
    x: number;
    y: number;
  };
  data: {
    label: string;
  };
}

export interface ReactFlowEdgeDto {
  id: string;
  source: string;
  target: string;
}

export interface ReactFlowDto {
  nodes: ReactFlowNodeDto[];
  edges: ReactFlowEdgeDto[];
}
