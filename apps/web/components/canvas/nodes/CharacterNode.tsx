'use client';

import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { User } from 'lucide-react';

export interface CharacterNodeData {
  label: string;
  entityId: string;
  name: string;
  description?: string;
  thumbnail?: string;
}

function CharacterNodeComponent({ data }: NodeProps) {
  const d = data as unknown as CharacterNodeData;

  return (
    <div className="bg-zinc-900 border border-emerald-500/40 rounded-xl shadow-lg shadow-emerald-500/5 min-w-[180px] max-w-[240px]">
      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-emerald-500 !w-3 !h-3 !border-2 !border-zinc-900"
      />

      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-800">
        <User className="h-4 w-4 text-emerald-400" />
        <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Character</span>
      </div>

      {/* Content */}
      <div className="px-3 py-3 flex items-center gap-3">
        {d.thumbnail ? (
          <img
            src={d.thumbnail}
            alt={d.name}
            className="h-10 w-10 rounded-lg object-cover border border-zinc-700"
          />
        ) : (
          <div className="h-10 w-10 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center">
            <User className="h-5 w-5 text-zinc-600" />
          </div>
        )}
        <div className="min-w-0">
          <p className="text-sm font-medium text-zinc-200 truncate">{d.name}</p>
          {d.description && (
            <p className="text-xs text-zinc-500 truncate">{d.description}</p>
          )}
        </div>
      </div>

      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-emerald-500 !w-3 !h-3 !border-2 !border-zinc-900"
      />
    </div>
  );
}

export const CharacterNode = memo(CharacterNodeComponent);
