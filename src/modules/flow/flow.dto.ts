export interface Node {
  id: string;
  label: string;
}

export interface Edge {
  id: string;
  source: string;
  target: string;
}

export interface FlowDto {
  nodes: Node[];
  edges: Edge[];
}
