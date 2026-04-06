export type CanvasNodeType =
  | 'idea'
  | 'script'
  | 'scene'
  | 'storyboard'
  | 'character'
  | 'voiceTrack'
  | 'videoSegment'
  | 'finalCut'
  | 'agentJob';

export interface CanvasNodeData {
  label: string;
  entityId: string;
  entityType: string;
  status?: string;
  thumbnail?: string;
  progress?: number;
}

export interface CanvasNode {
  id: string;
  type: CanvasNodeType;
  position: { x: number; y: number };
  data: CanvasNodeData;
}

export interface CanvasEdge {
  id: string;
  source: string;
  target: string;
  type?: 'pipeline' | 'dependency';
}

export interface CanvasState {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  viewport: {
    x: number;
    y: number;
    zoom: number;
  };
}
