'use client';

import { Lightbulb, LayoutGrid, Command } from 'lucide-react';

interface CanvasToolbarProps {
  onAddIdea: () => void;
  onAutoLayout: () => void;
  onOpenCommandBar: () => void;
}

export function CanvasToolbar({ onAddIdea, onAutoLayout, onOpenCommandBar }: CanvasToolbarProps) {
  return (
    <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
      <button
        onClick={onAddIdea}
        className="flex items-center gap-2 px-3 py-2 text-xs font-medium bg-amber-500/10 text-amber-400 rounded-lg border border-amber-500/20 hover:bg-amber-500/20 transition-colors shadow-lg backdrop-blur-sm"
      >
        <Lightbulb className="h-3.5 w-3.5" />
        Add Idea
      </button>

      <button
        onClick={onAutoLayout}
        className="flex items-center gap-2 px-3 py-2 text-xs font-medium bg-zinc-800/80 text-zinc-400 rounded-lg border border-zinc-700 hover:bg-zinc-700/80 hover:text-zinc-300 transition-colors shadow-lg backdrop-blur-sm"
      >
        <LayoutGrid className="h-3.5 w-3.5" />
        Layout
      </button>

      <button
        onClick={onOpenCommandBar}
        className="flex items-center gap-2 px-3 py-2 text-xs font-medium bg-zinc-800/80 text-zinc-400 rounded-lg border border-zinc-700 hover:bg-zinc-700/80 hover:text-zinc-300 transition-colors shadow-lg backdrop-blur-sm"
      >
        <Command className="h-3.5 w-3.5" />
        <kbd className="text-[10px] font-mono text-zinc-500">/</kbd>
      </button>
    </div>
  );
}
