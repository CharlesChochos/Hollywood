'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Sparkles,
  Clapperboard,
  X,
  Sun,
  Moon,
} from 'lucide-react';
import { useTheme } from '@/components/shared/ThemeProvider';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
];

interface AppSidebarProps {
  open?: boolean;
  onClose?: () => void;
}

export function AppSidebar({ open, onClose }: AppSidebarProps) {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();

  const sidebarContent = (
    <aside className="w-64 border-r border-zinc-800 bg-zinc-950 flex flex-col h-full">
      {/* Logo */}
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2" onClick={onClose}>
          <Clapperboard className="h-8 w-8 text-amber-500" />
          <div>
            <h1 className="text-lg font-bold text-white leading-tight">Hollywood</h1>
            <p className="text-xs text-zinc-500">AI Studio</p>
          </div>
        </Link>
        {/* Close button — only visible on mobile */}
        {onClose && (
          <button
            onClick={onClose}
            className="md:hidden p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-zinc-800 text-white'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-zinc-800 space-y-1">
        <div className="flex items-center gap-2 px-3 py-2 text-xs text-zinc-500">
          <Sparkles className="h-3 w-3" />
          <span>AI Agents: 7 ready</span>
        </div>
        <div className="flex items-center justify-between px-3 py-1">
          <div className="flex items-center gap-2 text-xs text-zinc-600">
            <span>Press</span>
            <kbd className="px-1.5 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-zinc-500 font-mono text-[10px]">?</kbd>
            <span>for shortcuts</span>
          </div>
          <button
            onClick={toggleTheme}
            className="p-1.5 text-zinc-500 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop: always visible */}
      <div className="hidden md:flex">{sidebarContent}</div>

      {/* Mobile: overlay */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={onClose} />
          <div className="relative z-50 h-full">{sidebarContent}</div>
        </div>
      )}
    </>
  );
}
