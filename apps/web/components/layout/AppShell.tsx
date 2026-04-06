'use client';

import { useState } from 'react';
import { Menu } from 'lucide-react';
import { AppSidebar } from './AppSidebar';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { GlobalShortcuts } from '@/components/shared/GlobalShortcuts';

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile header with hamburger */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-zinc-800 bg-zinc-950">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="text-sm font-semibold text-white">Hollywood AI Studio</span>
        </div>

        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </main>

      <GlobalShortcuts />
    </div>
  );
}
