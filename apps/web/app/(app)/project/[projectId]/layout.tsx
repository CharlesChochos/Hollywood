'use client';

import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { TopBar } from '@/components/layout/TopBar';
import { trpc } from '@/lib/trpc';
import {
  Map,
  FileText,
  Users,
  GitBranch,
  SlidersHorizontal,
  BarChart3,
  Clock,
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

  const projectQuery = trpc.project.getById.useQuery({ id: projectId });

  return (
    <>
      <TopBar title={projectQuery.data?.name ?? 'Loading...'} />

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
        {children}
      </div>
    </>
  );
}
