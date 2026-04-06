'use client';

import { Lightbulb, LayoutGrid, Command, Undo2, Redo2 } from 'lucide-react';
import { useCanvasStore } from './use-canvas-store';

interface CanvasToolbarProps {
  onAddIdea: () => void;
  onAutoLayout: () => void;
  onOpenCommandBar: () => void;
}

const toolbarBtnClass =
  'flex items-center gap-2 px-3 py-2 text-xs font-medium bg-zinc-800/80 text-zinc-400 rounded-lg border border-zinc-700 hover:bg-zinc-700/80 hover:text-zinc-300 transition-colors shadow-lg backdrop-blur-sm disabled:opacity-30 disabled:cursor-not-allowed';

export function CanvasToolbar({ onAddIdea, onAutoLayout, onOpenCommandBar }: CanvasToolbarProps) {
  const undo = useCanvasStore((s) => s.undo);
  const redo = useCanvasStore((s) => s.redo);
  const canUndo = useCanvasStore((s) => s.canUndo());
  const canRedo = useCanvasStore((s) => s.canRedo());

  return (
    <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
      <button
        onClick={onAddIdea}
        className="flex items-center gap-2 px-3 py-2 text-xs font-medium bg-amber-500/10 text-amber-400 rounded-lg border border-amber-500/20 hover:bg-amber-500/20 transition-colors shadow-lg backdrop-blur-sm"
      >
        <Lightbulb className="h-3.5 w-3.5" />
        Add Idea
      </button>

      <button onClick={onAutoLayout} className={toolbarBtnClass}>
        <LayoutGrid className="h-3.5 w-3.5" />
        Layout
      </button>

      <div className="h-5 w-px bg-zinc-700" />

      <button onClick={undo} disabled={!canUndo} className={toolbarBtnClass} title="Undo (Cmd+Z)">
        <Undo2 className="h-3.5 w-3.5" />
      </button>

      <button onClick={redo} disabled={!canRedo} className={toolbarBtnClass} title="Redo (Cmd+Shift+Z)">
        <Redo2 className="h-3.5 w-3.5" />
      </button>

      <div className="h-5 w-px bg-zinc-700" />

      <button onClick={onOpenCommandBar} className={toolbarBtnClass}>
        <Command className="h-3.5 w-3.5" />
        <kbd className="text-[10px] font-mono text-zinc-500">/</kbd>
      </button>
    </div>
  );
}
