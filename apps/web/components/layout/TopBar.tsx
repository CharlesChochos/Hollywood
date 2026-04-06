'use client';

import { Search, Bell } from 'lucide-react';

interface TopBarProps {
  title?: string;
  children?: React.ReactNode;
}

export function TopBar({ title, children }: TopBarProps) {
  return (
    <header className="h-14 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        {title && <h2 className="text-lg font-semibold text-white">{title}</h2>}
      </div>

      <div className="flex items-center gap-3">
        {children}
        {/* Command bar trigger */}
        <button
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800/50 border border-zinc-700 text-sm text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors"
          onClick={() => {
            // TODO: Phase 3 — open command bar
          }}
        >
          <Search className="h-3.5 w-3.5" />
          <span>Command...</span>
          <kbd className="ml-2 text-xs bg-zinc-700 px-1.5 py-0.5 rounded">/</kbd>
        </button>

        <button className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors relative">
          <Bell className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
