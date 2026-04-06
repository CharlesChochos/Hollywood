'use client';

import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { Bot, Loader2, CheckCircle2, XCircle } from 'lucide-react';

export interface AgentJobNodeData {
  label: string;
  entityId: string;
  agentType: string;
  status: string;
  progress: number;
  message?: string;
}

const AGENT_COLORS: Record<string, string> = {
  script_writer: 'blue',
  storyboard_creator: 'violet',
  character_generator: 'emerald',
  voice_actor: 'orange',
  video_generator: 'rose',
  editing: 'cyan',
  marketing: 'yellow',
};

function AgentJobNodeComponent({ data }: NodeProps) {
  const d = data as unknown as AgentJobNodeData;
  const color = AGENT_COLORS[d.agentType] ?? 'zinc';

  const StatusIcon = d.status === 'completed' ? CheckCircle2
    : d.status === 'failed' ? XCircle
    : d.status === 'active' ? Loader2
    : Bot;

  return (
    <div className={`bg-zinc-900 border border-${color}-500/30 rounded-xl shadow-lg min-w-[200px] max-w-[260px]`}
      style={{ borderColor: `color-mix(in srgb, var(--color-${color}-500, #71717a) 30%, transparent)` }}
    >
      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-zinc-500 !w-3 !h-3 !border-2 !border-zinc-900"
      />

      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-800">
        <StatusIcon className={`h-4 w-4 text-zinc-400 ${d.status === 'active' ? 'animate-spin' : ''}`} />
        <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider truncate">
          {d.agentType.replace(/_/g, ' ')}
        </span>
      </div>

      {/* Progress */}
      <div className="px-3 py-3 space-y-2">
        {d.status === 'active' && (
          <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-amber-500 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${d.progress}%` }}
            />
          </div>
        )}
        <p className="text-xs text-zinc-500 truncate">
          {d.status === 'completed' ? 'Done' :
           d.status === 'failed' ? (d.message ?? 'Failed') :
           d.status === 'active' ? (d.message ?? `${d.progress}%`) :
           'Queued'}
        </p>
      </div>

      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-zinc-500 !w-3 !h-3 !border-2 !border-zinc-900"
      />
    </div>
  );
}

export const AgentJobNode = memo(AgentJobNodeComponent);
