'use client';

import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

export interface ShortcutDef {
  key: string;
  meta?: boolean;     // Cmd on Mac, Ctrl on Windows
  shift?: boolean;
  label: string;
  action: () => void;
}

/**
 * Returns the list of registered shortcuts (for the help overlay)
 * and registers global keydown listeners.
 */
export function useKeyboardShortcuts({
  onToggleHelp,
  onToggleCommandBar,
}: {
  onToggleHelp: () => void;
  onToggleCommandBar?: () => void;
}) {
  const router = useRouter();

  const shortcuts: ShortcutDef[] = [
    { key: '?', label: 'Show keyboard shortcuts', action: onToggleHelp },
    { key: 'd', meta: true, label: 'Go to Dashboard', action: () => router.push('/dashboard') },
    ...(onToggleCommandBar
      ? [{ key: 'k', meta: true, label: 'Open command bar', action: onToggleCommandBar }]
      : []),
    { key: 'Escape', label: 'Close dialog / overlay', action: onToggleHelp },
  ];

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      ) {
        return;
      }

      const isMeta = e.metaKey || e.ctrlKey;

      for (const shortcut of shortcuts) {
        const metaMatch = shortcut.meta ? isMeta : !isMeta;
        const shiftMatch = shortcut.shift ? e.shiftKey : true;

        if (e.key === shortcut.key && metaMatch && shiftMatch) {
          e.preventDefault();
          shortcut.action();
          return;
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onToggleHelp, onToggleCommandBar, router],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return shortcuts;
}
