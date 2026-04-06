'use client';

import { Loader2 } from 'lucide-react';

/** Full-page centered spinner — use as a Suspense fallback or loading state. */
export function PageSpinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[200px] gap-3">
      <Loader2 className="h-6 w-6 text-amber-500 animate-spin" />
      {label && <p className="text-sm text-zinc-500">{label}</p>}
    </div>
  );
}

/** Card skeleton for project grid. */
export function ProjectCardSkeleton() {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 animate-pulse">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-4 w-4 bg-zinc-800 rounded" />
        <div className="h-4 w-32 bg-zinc-800 rounded" />
      </div>
      <div className="h-3 w-full bg-zinc-800 rounded mb-2" />
      <div className="h-3 w-2/3 bg-zinc-800 rounded mb-4" />
      <div className="flex gap-2">
        <div className="h-5 w-16 bg-zinc-800 rounded-full" />
        <div className="h-5 w-12 bg-zinc-800 rounded-full" />
      </div>
      <div className="h-1.5 w-full bg-zinc-800 rounded-full mt-3" />
    </div>
  );
}

/** Grid of project card skeletons. */
export function ProjectGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <ProjectCardSkeleton key={i} />
      ))}
    </div>
  );
}

/** Timeline job skeleton. */
export function TimelineJobSkeleton() {
  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="h-5 w-5 bg-zinc-800 rounded" />
        <div className="h-4 w-28 bg-zinc-800 rounded" />
        <div className="ml-auto h-3 w-16 bg-zinc-800 rounded" />
      </div>
    </div>
  );
}
