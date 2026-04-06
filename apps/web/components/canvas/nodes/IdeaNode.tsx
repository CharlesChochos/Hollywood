'use client';

import { memo, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { Lightbulb, Sparkles, Loader2 } from 'lucide-react';
import { trpc } from '@/lib/trpc';

export interface IdeaNodeData {
  label: string;
  entityId: string;
  prompt: string;
  status: string;
  projectId: string;
}

function IdeaNodeComponent({ data }: NodeProps) {
  const d = data as unknown as IdeaNodeData;
  const utils = trpc.useUtils();
  const [isGenerating, setIsGenerating] = useState(false);

  const createIdea = trpc.idea.create.useMutation({
    onSuccess: () => {
      utils.agent.getByProject.invalidate();
      setIsGenerating(true);
    },
  });

  const handleGenerate = () => {
    if (isGenerating || d.status === 'processing') return;
    createIdea.mutate({
      projectId: d.projectId,
      prompt: d.prompt,
    });
  };

  const isProcessing = isGenerating || d.status === 'processing';

  return (
    <div className="bg-zinc-900 border border-amber-500/40 rounded-xl shadow-lg shadow-amber-500/5 min-w-[220px] max-w-[280px]">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-800">
        <Lightbulb className="h-4 w-4 text-amber-400" />
        <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Idea</span>
      </div>

      {/* Content */}
      <div className="px-3 py-3">
        <p className="text-sm text-zinc-300 line-clamp-3">{d.prompt}</p>
      </div>

      {/* Action */}
      <div className="px-3 pb-3">
        <button
          onClick={handleGenerate}
          disabled={isProcessing}
          className="w-full flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="h-3 w-3" />
              Generate Script
            </>
          )}
        </button>
      </div>

      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-amber-500 !w-3 !h-3 !border-2 !border-zinc-900"
      />
    </div>
  );
}

export const IdeaNode = memo(IdeaNodeComponent);
