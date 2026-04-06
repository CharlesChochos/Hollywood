'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { TopBar } from '@/components/layout/TopBar';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { trpc } from '@/lib/trpc';
import {
  Map,
  FileText,
  Users,
  GitBranch,
  SlidersHorizontal,
  BarChart3,
  Clock,
  Download,
  Loader2,
} from 'lucide-react';

const tabs = [
  { path: '', label: "Director's Map", icon: Map },
  { path: '/script', label: 'Script', icon: FileText },
  { path: '/characters', label: 'Characters', icon: Users },
  { path: '/timeline', label: 'Timeline', icon: Clock },
  { path: '/review', label: 'Review', icon: GitBranch },
  { path: '/control-room', label: 'Control Room', icon: SlidersHorizontal },
  { path: '/distribution', label: 'Distribution', icon: BarChart3 },
];

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const pathname = usePathname();
  const projectId = params.projectId as string;
  const basePath = `/project/${projectId}`;
  const [isExporting, setIsExporting] = useState(false);

  const projectQuery = trpc.project.getById.useQuery({ id: projectId });
  const utils = trpc.useUtils();

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const data = await utils.project.exportProject.fetch({ id: projectId });
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(projectQuery.data?.name ?? 'project').replace(/[^a-z0-9]/gi, '_').toLowerCase()}_export.json`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <TopBar title={projectQuery.data?.name ?? 'Loading...'}>
        <button
          onClick={handleExport}
          disabled={isExporting}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg transition-colors disabled:opacity-50"
          title="Export project as JSON"
        >
          {isExporting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Download className="h-3.5 w-3.5" />
          )}
          Export
        </button>
      </TopBar>

      {/* Tab Navigation */}
      <div className="border-b border-zinc-800 bg-zinc-950/50">
        <nav className="flex gap-1 px-4 overflow-x-auto">
          {tabs.map((tab) => {
            const fullPath = `${basePath}${tab.path}`;
            const isActive = tab.path === ''
              ? pathname === basePath
              : pathname.startsWith(fullPath);
            return (
              <Link
                key={tab.path}
                href={fullPath}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  isActive
                    ? 'border-amber-500 text-amber-400'
                    : 'border-transparent text-zinc-500 hover:text-zinc-300 hover:border-zinc-700'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Page Content */}
      <div className="flex-1 overflow-hidden">
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </div>
    </>
  );
}
