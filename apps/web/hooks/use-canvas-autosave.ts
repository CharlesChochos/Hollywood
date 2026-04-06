'use client';

import { useEffect, useRef } from 'react';
import { useCanvasStore } from '@/components/canvas/use-canvas-store';
import { trpc } from '@/lib/trpc';

const SAVE_DEBOUNCE_MS = 2000;

/**
 * Auto-saves canvas state to the server when dirty, with debouncing.
 * Also wires up Cmd+Z / Cmd+Shift+Z for undo/redo.
 */
export function useCanvasAutosave(projectId: string) {
  const isDirty = useCanvasStore((s) => s.isDirty);
  const nodes = useCanvasStore((s) => s.nodes);
  const edges = useCanvasStore((s) => s.edges);
  const viewport = useCanvasStore((s) => s.viewport);
  const markClean = useCanvasStore((s) => s.markClean);
  const undo = useCanvasStore((s) => s.undo);
  const redo = useCanvasStore((s) => s.redo);

  const updateCanvas = trpc.project.updateCanvas.useMutation();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced auto-save
  useEffect(() => {
    if (!isDirty) return;

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      updateCanvas.mutate(
        { id: projectId, canvasState: { nodes, edges, viewport } },
        { onSuccess: () => markClean() },
      );
    }, SAVE_DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDirty, nodes, edges, viewport, projectId]);

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      // Don't intercept if focus is in an input
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo]);
}
