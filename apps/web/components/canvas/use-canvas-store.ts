'use client';

import { create } from 'zustand';
import {
  type Node,
  type Edge,
  type Viewport,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
} from '@xyflow/react';

interface HistoryEntry {
  nodes: Node[];
  edges: Edge[];
}

const MAX_HISTORY = 50;

interface CanvasStore {
  nodes: Node[];
  edges: Edge[];
  viewport: Viewport;

  // React Flow callbacks
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;

  // Actions
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  setViewport: (viewport: Viewport) => void;
  addNode: (node: Node) => void;
  addEdgeAction: (edge: Edge) => void;
  updateNodeData: (nodeId: string, data: Partial<Record<string, unknown>>) => void;
  loadCanvasState: (nodes: Node[], edges: Edge[], viewport: Viewport) => void;

  // Dirty tracking for persistence
  isDirty: boolean;
  markClean: () => void;

  // Undo/redo
  undoStack: HistoryEntry[];
  redoStack: HistoryEntry[];
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

export const useCanvasStore = create<CanvasStore>((set, get) => ({
  nodes: [],
  edges: [],
  viewport: { x: 0, y: 0, zoom: 1 },
  isDirty: false,
  undoStack: [],
  redoStack: [],

  pushHistory: () => {
    const { nodes, edges, undoStack } = get();
    const entry: HistoryEntry = {
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
    };
    set({
      undoStack: [...undoStack.slice(-MAX_HISTORY + 1), entry],
      redoStack: [], // Clear redo on new action
    });
  },

  undo: () => {
    const { undoStack, nodes, edges } = get();
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1]!;
    const current: HistoryEntry = {
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
    };
    set({
      nodes: prev.nodes,
      edges: prev.edges,
      undoStack: undoStack.slice(0, -1),
      redoStack: [...get().redoStack, current],
      isDirty: true,
    });
  },

  redo: () => {
    const { redoStack, nodes, edges } = get();
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1]!;
    const current: HistoryEntry = {
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
    };
    set({
      nodes: next.nodes,
      edges: next.edges,
      redoStack: redoStack.slice(0, -1),
      undoStack: [...get().undoStack, current],
      isDirty: true,
    });
  },

  canUndo: () => get().undoStack.length > 0,
  canRedo: () => get().redoStack.length > 0,

  onNodesChange: (changes) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes),
      isDirty: true,
    });
  },

  onEdgesChange: (changes) => {
    set({
      edges: applyEdgeChanges(changes, get().edges),
      isDirty: true,
    });
  },

  onConnect: (connection) => {
    get().pushHistory();
    set({
      edges: addEdge(connection, get().edges),
      isDirty: true,
    });
  },

  setNodes: (nodes) => set({ nodes, isDirty: true }),
  setEdges: (edges) => set({ edges, isDirty: true }),
  setViewport: (viewport) => set({ viewport }),

  addNode: (node) => {
    get().pushHistory();
    set((state) => ({
      nodes: [...state.nodes, node],
      isDirty: true,
    }));
  },

  addEdgeAction: (edge) => {
    get().pushHistory();
    set((state) => ({
      edges: [...state.edges, edge],
      isDirty: true,
    }));
  },

  updateNodeData: (nodeId, data) =>
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n,
      ),
      isDirty: true,
    })),

  loadCanvasState: (nodes, edges, viewport) =>
    set({ nodes, edges, viewport, isDirty: false }),

  markClean: () => set({ isDirty: false }),
}));
