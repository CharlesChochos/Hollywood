'use client';

import { Keyboard, X } from 'lucide-react';
import type { ShortcutDef } from '@/hooks/use-keyboard-shortcuts';

function formatKey(shortcut: ShortcutDef): string[] {
  const keys: string[] = [];
  if (shortcut.meta) keys.push('⌘');
  if (shortcut.shift) keys.push('⇧');
  keys.push(shortcut.key === 'Escape' ? 'Esc' : shortcut.key.toUpperCase());
  return keys;
}

export function KeyboardShortcutsOverlay({
  shortcuts,
  onClose,
}: {
  shortcuts: ShortcutDef[];
  onClose: () => void;
}) {
  // Filter out Escape from display (it's meta, not a standalone shortcut to show)
  const displayShortcuts = shortcuts.filter((s) => s.key !== 'Escape');

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 w-full max-w-md shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Keyboard className="h-5 w-5 text-amber-500" />
            <h3 className="text-lg font-semibold text-white">Keyboard Shortcuts</h3>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-2">
          {displayShortcuts.map((shortcut) => (
            <div
              key={`${shortcut.meta ? 'meta-' : ''}${shortcut.key}`}
              className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-zinc-800/50"
            >
              <span className="text-sm text-zinc-300">{shortcut.label}</span>
              <div className="flex items-center gap-1">
                {formatKey(shortcut).map((k) => (
                  <kbd
                    key={k}
                    className="px-2 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-xs font-mono text-zinc-300"
                  >
                    {k}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-zinc-600 mt-4 text-center">
          Press <kbd className="px-1.5 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-zinc-400 font-mono">Esc</kbd> to close
        </p>
      </div>
    </div>
  );
}
