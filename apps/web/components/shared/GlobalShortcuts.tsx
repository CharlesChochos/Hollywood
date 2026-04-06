'use client';

import { useState } from 'react';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { KeyboardShortcutsOverlay } from './KeyboardShortcutsOverlay';

export function GlobalShortcuts() {
  const [showHelp, setShowHelp] = useState(false);

  const shortcuts = useKeyboardShortcuts({
    onToggleHelp: () => setShowHelp((prev) => !prev),
  });

  return showHelp ? (
    <KeyboardShortcutsOverlay
      shortcuts={shortcuts}
      onClose={() => setShowHelp(false)}
    />
  ) : null;
}
