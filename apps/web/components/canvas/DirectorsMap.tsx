'use client';

import { useCallback, useEffect, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  type Viewport,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useCanvasStore } from './use-canvas-store';
import { useSemanticZoom } from './hooks/use-semantic-zoom';
import { IdeaNode, ScriptNode, SceneNode, CharacterNode, AgentJobNode } from './nodes';
import { trpc } from '@/lib/trpc';

// Must be defined outside component to prevent re-renders
const nodeTypes = {
  idea: IdeaNode,
  script: ScriptNode,
  scene: SceneNode,
  character: CharacterNode,
  agentJob: AgentJobNode,
};

const defaultEdgeOptions = {
  animated: true,
  style: { stroke: '#52525b', strokeWidth: 1.5 },
};

interface DirectorsMapProps {
  projectId: string;
}

export function DirectorsMap({ projectId }: DirectorsMapProps) {
  const {
    nodes,
    edges,
    viewport,
    onNodesChange,
    onEdgesChange,
    onConnect,
    setViewport,
    isDirty,
    markClean,
  } = useCanvasStore();

  const { zoomLevel, onViewportChange: onSemanticZoomChange } = useSemanticZoom();
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateCanvas = trpc.project.updateCanvas.useMutation();

  // Debounced save to DB
  useEffect(() => {
    if (!isDirty) return;

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      updateCanvas.mutate({
        id: projectId,
        canvasState: { nodes, edges, viewport },
      });
      markClean();
    }, 1500);

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [isDirty, nodes, edges, viewport, projectId, updateCanvas, markClean]);

  const handleViewportChange = useCallback(
    (vp: Viewport) => {
      setViewport(vp);
      onSemanticZoomChange(vp);
    },
    [setViewport, onSemanticZoomChange],
  );

  return (
    <div className="w-full h-full" data-zoom-level={zoomLevel}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onViewportChange={handleViewportChange}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        defaultViewport={viewport}
        fitView={nodes.length > 0}
        proOptions={{ hideAttribution: true }}
        className="bg-zinc-950"
        minZoom={0.1}
        maxZoom={2}
        snapToGrid
        snapGrid={[20, 20]}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="#27272a"
        />
        <Controls
          className="!bg-zinc-900 !border-zinc-700 !shadow-lg [&>button]:!bg-zinc-800 [&>button]:!border-zinc-700 [&>button]:!text-zinc-400 [&>button:hover]:!bg-zinc-700"
        />
        <MiniMap
          className="!bg-zinc-900 !border-zinc-700"
          nodeColor={(node) => {
            switch (node.type) {
              case 'idea': return '#f59e0b';
              case 'script': return '#3b82f6';
              case 'scene': return '#a855f7';
              case 'character': return '#10b981';
              case 'agentJob': return '#71717a';
              default: return '#52525b';
            }
          }}
          maskColor="rgba(0, 0, 0, 0.7)"
        />
      </ReactFlow>
    </div>
  );
}
