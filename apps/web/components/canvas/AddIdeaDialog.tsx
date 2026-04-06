'use client';

import { useState, useRef, useEffect } from 'react';
import { Lightbulb, X } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useCanvasStore } from './use-canvas-store';

interface AddIdeaDialogProps {
  projectId: string;
  open: boolean;
  onClose: () => void;
}

/**
 * Dialog for adding a new idea node to the canvas.
 * When submitted, creates an idea and enqueues the script_writer agent.
 */
export function AddIdeaDialog({ projectId, open, onClose }: AddIdeaDialogProps) {
  const [prompt, setPrompt] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { addNode, addEdgeAction, viewport } = useCanvasStore();

  const utils = trpc.useUtils();
  const createIdea = trpc.idea.create.useMutation({
    onSuccess: (idea) => {
      // Add the idea node to the canvas at center of current viewport
      const newNode = {
        id: `idea-${idea!.id}`,
        type: 'idea' as const,
        position: {
          x: -viewport.x / viewport.zoom + 400,
          y: -viewport.y / viewport.zoom + 200,
        },
        data: {
          label: prompt.slice(0, 40),
          entityId: idea!.id,
          prompt: idea!.prompt,
          status: 'processing',
          projectId,
        },
      };
      addNode(newNode);

      utils.idea.getByProject.invalidate({ projectId });
      utils.agent.getByProject.invalidate({ projectId });
      setPrompt('');
      onClose();
    },
  });

  useEffect(() => {
    if (open) {
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }, [open]);

  if (!open) return null;

  const handleSubmit = () => {
    const trimmed = prompt.trim();
    if (!trimmed) return;
    createIdea.mutate({ projectId, prompt: trimmed });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl w-full max-w-lg mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-amber-400" />
            <h3 className="text-sm font-semibold text-zinc-200">New Idea</h3>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4">
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.metaKey) handleSubmit();
            }}
            placeholder="Describe your film idea... e.g. 'A lonely robot discovers a garden on Mars'"
            className="w-full h-32 bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 resize-none focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/50"
          />
          <p className="text-xs text-zinc-600 mt-2">
            Press <kbd className="px-1.5 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-zinc-400 font-mono">Cmd+Enter</kbd> to submit
          </p>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-5 py-4 border-t border-zinc-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!prompt.trim() || createIdea.isPending}
            className="px-4 py-2 text-sm font-medium bg-amber-500/10 text-amber-400 rounded-lg border border-amber-500/20 hover:bg-amber-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {createIdea.isPending ? 'Creating...' : 'Create & Generate Script'}
          </button>
        </div>
      </div>
    </div>
  );
}
