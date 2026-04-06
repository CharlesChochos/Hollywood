'use client';

import { useState, useCallback, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useReactFlow, ReactFlowProvider } from '@xyflow/react';
import type { Node, Edge } from '@xyflow/react';

import { DirectorsMap } from '@/components/canvas/DirectorsMap';
import { CanvasToolbar } from '@/components/canvas/CanvasToolbar';
import { AddIdeaDialog } from '@/components/canvas/AddIdeaDialog';
import { CommandBar, useDirectorsMapCommands } from '@/components/chat-ops/CommandBar';
import { useCanvasStore } from '@/components/canvas/use-canvas-store';
import { getLayoutedElements } from '@/components/canvas/auto-layout';
import { useAgentProgress } from '@/hooks/use-agent-progress';
import { trpc } from '@/lib/trpc';

function DirectorsMapInner() {
  const params = useParams();
  const projectId = params.projectId as string;

  const [showAddIdea, setShowAddIdea] = useState(false);
  const [showCommandBar, setShowCommandBar] = useState(false);

  const { nodes, edges, loadCanvasState, setNodes, setEdges, updateNodeData } = useCanvasStore();

  // Connect real-time agent progress
  const agentJobs = useAgentProgress(projectId);

  // Update agent job nodes in real-time
  useEffect(() => {
    for (const [jobId, job] of agentJobs) {
      const nodeId = `job-${jobId}`;
      const existingNode = nodes.find((n) => n.id === nodeId);
      if (existingNode) {
        updateNodeData(nodeId, {
          status: job.status,
          progress: job.progress,
          message: job.message,
        });
      }
    }
  }, [agentJobs]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load project data and hydrate canvas
  const projectQuery = trpc.project.getById.useQuery({ id: projectId });

  useEffect(() => {
    if (!projectQuery.data) return;

    const savedState = projectQuery.data.canvasState as {
      nodes?: Node[];
      edges?: Edge[];
      viewport?: { x: number; y: number; zoom: number };
    } | null;

    if (savedState?.nodes?.length) {
      loadCanvasState(
        savedState.nodes,
        savedState.edges ?? [],
        savedState.viewport ?? { x: 0, y: 0, zoom: 1 },
      );
      return;
    }

    // Build canvas from entity data if no saved state
    const project = projectQuery.data;
    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];

    if (project.ideas) {
      for (const idea of project.ideas) {
        newNodes.push({
          id: `idea-${idea.id}`,
          type: 'idea',
          position: { x: 0, y: 0 },
          data: {
            label: idea.prompt.slice(0, 40),
            entityId: idea.id,
            prompt: idea.prompt,
            status: idea.status,
            projectId,
          },
        });
      }
    }

    if (newNodes.length > 0) {
      const { nodes: layouted } = getLayoutedElements(newNodes, newEdges);
      loadCanvasState(layouted, newEdges, { x: 0, y: 0, zoom: 1 });
    } else {
      loadCanvasState([], [], { x: 0, y: 0, zoom: 1 });
    }
  }, [projectQuery.data]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-layout action
  const handleAutoLayout = useCallback(() => {
    const { nodes: layouted, edges: layoutedEdges } = getLayoutedElements(nodes, edges);
    setNodes(layouted);
    setEdges(layoutedEdges);
  }, [nodes, edges, setNodes, setEdges]);

  // Fit view — delegate to ReactFlow instance
  const reactFlowInstance = useReactFlow();
  const handleFitView = useCallback(() => {
    reactFlowInstance.fitView({ padding: 0.2, duration: 300 });
  }, [reactFlowInstance]);

  // Command bar commands
  const commands = useDirectorsMapCommands({
    onAddIdea: () => setShowAddIdea(true),
    onAutoLayout: handleAutoLayout,
    onFitView: handleFitView,
  });

  // Global "/" key to open command bar
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === '/' && !e.metaKey && !e.ctrlKey) {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
        e.preventDefault();
        setShowCommandBar(true);
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  return (
    <div className="relative w-full h-full">
      <DirectorsMap projectId={projectId} />

      <CanvasToolbar
        onAddIdea={() => setShowAddIdea(true)}
        onAutoLayout={handleAutoLayout}
        onOpenCommandBar={() => setShowCommandBar(true)}
      />

      <AddIdeaDialog
        projectId={projectId}
        open={showAddIdea}
        onClose={() => setShowAddIdea(false)}
      />

      <CommandBar
        open={showCommandBar}
        onClose={() => setShowCommandBar(false)}
        commands={commands}
      />
    </div>
  );
}

export default function DirectorsMapPage() {
  return (
    <ReactFlowProvider>
      <DirectorsMapInner />
    </ReactFlowProvider>
  );
}
