import type { AgentType, AgentOutput } from './agent.types';
import type { CanvasNode, CanvasEdge } from './canvas.types';

export interface ServerToClientEvents {
  'agent:progress': (data: {
    jobId: string;
    agentType: AgentType;
    progress: number;
    message: string;
  }) => void;

  'agent:completed': (data: {
    jobId: string;
    agentType: AgentType;
    result: AgentOutput;
  }) => void;

  'agent:failed': (data: {
    jobId: string;
    agentType: AgentType;
    error: string;
  }) => void;

  'canvas:nodeCreated': (data: { node: CanvasNode; senderId?: string }) => void;
  'canvas:nodeUpdated': (data: { node: CanvasNode; senderId?: string }) => void;
  'canvas:edgeCreated': (data: { edge: CanvasEdge }) => void;

  'pipeline:stageComplete': (data: {
    projectId: string;
    stage: AgentType;
    nextStage?: AgentType;
  }) => void;

  'pipeline:allComplete': (data: {
    projectId: string;
    finalCutId: string;
  }) => void;
}

export interface ClientToServerEvents {
  'project:join': (data: { projectId: string }) => void;
  'project:leave': (data: { projectId: string }) => void;
  'canvas:nodeUpdate': (data: { projectId: string; node: CanvasNode; senderId: string }) => void;
  'canvas:nodeCreate': (data: { projectId: string; node: CanvasNode; senderId: string }) => void;
}
