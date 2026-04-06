'use client';

import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { FileText, Heart } from 'lucide-react';

export interface ScriptNodeData {
  label: string;
  entityId: string;
  title: string;
  logline?: string;
  status: string;
  isSelected?: boolean;
  sceneCount?: number;
}

function ScriptNodeComponent({ data }: NodeProps) {
  const d = data as unknown as ScriptNodeData;

  return (
    <div className="bg-zinc-900 border border-blue-500/40 rounded-xl shadow-lg shadow-blue-500/5 min-w-[240px] max-w-[300px]">
      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-blue-500 !w-3 !h-3 !border-2 !border-zinc-900"
      />

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-blue-400" />
          <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">Script</span>
        </div>
        {d.isSelected && (
          <Heart className="h-3.5 w-3.5 text-rose-400 fill-rose-400" />
        )}
      </div>

      {/* Content */}
      <div className="px-3 py-3 space-y-1">
        <p className="text-sm font-medium text-zinc-200 truncate">{d.title}</p>
        {d.logline && (
          <p className="text-xs text-zinc-500 line-clamp-2">{d.logline}</p>
        )}
      </div>

      {/* Footer */}
      <div className="px-3 pb-2 flex items-center justify-between">
        <span className="text-xs text-zinc-600">
          {d.sceneCount ?? 0} scene{d.sceneCount !== 1 ? 's' : ''}
        </span>
        <span className={`text-xs px-1.5 py-0.5 rounded ${
          d.status === 'final' ? 'bg-green-500/10 text-green-400' :
          d.status === 'draft' ? 'bg-zinc-700/50 text-zinc-400' :
          'bg-blue-500/10 text-blue-400'
        }`}>
          {d.status}
        </span>
      </div>

      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-blue-500 !w-3 !h-3 !border-2 !border-zinc-900"
      />
    </div>
  );
}

export const ScriptNode = memo(ScriptNodeComponent);
