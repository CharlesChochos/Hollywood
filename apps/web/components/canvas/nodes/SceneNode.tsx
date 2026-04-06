'use client';

import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { Clapperboard } from 'lucide-react';

export interface SceneNodeData {
  label: string;
  entityId: string;
  sceneNumber: number;
  heading: string;
  emotionalBeat?: string;
  status: string;
  hasStoryboard?: boolean;
  hasVoice?: boolean;
  hasVideo?: boolean;
}

function SceneNodeComponent({ data }: NodeProps) {
  const d = data as unknown as SceneNodeData;

  return (
    <div className="bg-zinc-900 border border-purple-500/40 rounded-xl shadow-lg shadow-purple-500/5 min-w-[200px] max-w-[260px]">
      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-purple-500 !w-3 !h-3 !border-2 !border-zinc-900"
      />

      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-800">
        <Clapperboard className="h-4 w-4 text-purple-400" />
        <span className="text-xs font-semibold text-purple-400 uppercase tracking-wider">
          Scene {d.sceneNumber}
        </span>
      </div>

      {/* Content — visible at mid + micro zoom */}
      <div className="px-3 py-2 node-detail-mid">
        <p className="text-xs text-zinc-300 line-clamp-2">{d.heading}</p>
        <p className="text-xs text-zinc-600 mt-1 italic node-detail-micro">{d.emotionalBeat}</p>
      </div>

      {/* Pipeline indicators — visible at mid + micro zoom */}
      <div className="px-3 pb-2 flex items-center gap-2 node-detail-mid">
        <PipelineDot label="SB" active={d.hasStoryboard} />
        <PipelineDot label="VA" active={d.hasVoice} />
        <PipelineDot label="VG" active={d.hasVideo} />
      </div>

      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-purple-500 !w-3 !h-3 !border-2 !border-zinc-900"
      />
    </div>
  );
}

function PipelineDot({ label, active }: { label: string; active?: boolean }) {
  return (
    <span
      className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
        active
          ? 'bg-green-500/15 text-green-400'
          : 'bg-zinc-800 text-zinc-600'
      }`}
      title={label}
    >
      {label}
    </span>
  );
}

export const SceneNode = memo(SceneNodeComponent);
