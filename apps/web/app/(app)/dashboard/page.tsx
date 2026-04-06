'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus, Film, Clock, ChevronRight, Clapperboard,
  CheckCircle2, AlertCircle, Loader2, Layers, Search, X,
} from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { trpc } from '@/lib/trpc';

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft:       { label: 'Draft',       color: 'bg-zinc-800 text-zinc-400' },
  in_progress: { label: 'In Progress', color: 'bg-blue-900/50 text-blue-400' },
  review:      { label: 'Review',      color: 'bg-purple-900/50 text-purple-400' },
  published:   { label: 'Published',   color: 'bg-green-900/50 text-green-400' },
  archived:    { label: 'Archived',    color: 'bg-zinc-800 text-zinc-500' },
};

function PipelineProgress({ stats }: { stats: { completed: number; active: number; failed: number; total: number } }) {
  if (stats.total === 0) return null;
  const pct = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-zinc-500">Pipeline</span>
        <span className="text-zinc-400">{pct}%</span>
      </div>
      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden flex">
        {stats.completed > 0 && (
          <div
            className="bg-green-500 transition-all"
            style={{ width: `${(stats.completed / stats.total) * 100}%` }}
          />
        )}
        {stats.active > 0 && (
          <div
            className="bg-blue-500 animate-pulse transition-all"
            style={{ width: `${(stats.active / stats.total) * 100}%` }}
          />
        )}
        {stats.failed > 0 && (
          <div
            className="bg-red-500 transition-all"
            style={{ width: `${(stats.failed / stats.total) * 100}%` }}
          />
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const projectsQuery = trpc.project.listWithStats.useQuery();
  const createProject = trpc.project.create.useMutation({
    onSuccess: (project) => {
      setIsCreating(false);
      setNewName('');
      setNewDescription('');
      projectsQuery.refetch();
      router.push(`/project/${project!.id}`);
    },
  });

  const handleCreate = () => {
    if (newName.trim()) {
      createProject.mutate({
        name: newName.trim(),
        description: newDescription.trim() || undefined,
      });
    }
  };

  const filteredProjects = useMemo(() => {
    let list = projectsQuery.data ?? [];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.description?.toLowerCase().includes(q)),
      );
    }
    if (statusFilter) {
      list = list.filter((p) => p.status === statusFilter);
    }
    return list;
  }, [projectsQuery.data, search, statusFilter]);

  return (
    <>
      <TopBar title="Dashboard" />
      <div className="flex-1 overflow-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Your Projects</h1>
            <p className="text-sm text-zinc-400 mt-1">
              Create and manage your AI film productions
            </p>
          </div>
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Project
          </button>
        </div>

        {/* Search & Filters */}
        {(projectsQuery.data?.length ?? 0) > 0 && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
            {/* Search input */}
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search projects..."
                className="w-full pl-9 pr-8 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Status filter pills */}
            <div className="flex items-center gap-1.5">
              {[null, 'draft', 'in_progress', 'review', 'published'].map((status) => (
                <button
                  key={status ?? 'all'}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    statusFilter === status
                      ? 'bg-amber-600 text-white'
                      : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700'
                  }`}
                >
                  {status ? (STATUS_CONFIG[status]?.label ?? status) : 'All'}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Create Project Modal */}
        {isCreating && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold text-white mb-1">New Project</h3>
              <p className="text-sm text-zinc-500 mb-4">
                Start with a name — you can add ideas and configure the AI crew from the canvas.
              </p>
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Project name..."
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newName.trim()) handleCreate();
                  if (e.key === 'Escape') setIsCreating(false);
                }}
              />
              <textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Brief description (optional)..."
                rows={2}
                className="w-full mt-3 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 resize-none text-sm"
              />
              <div className="flex justify-end gap-3 mt-4">
                <button
                  onClick={() => { setIsCreating(false); setNewName(''); setNewDescription(''); }}
                  className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={!newName.trim() || createProject.isPending}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  {createProject.isPending ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Project Grid */}
        {projectsQuery.isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-amber-500 border-t-transparent" />
          </div>
        ) : (projectsQuery.data?.length ?? 0) === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Film className="h-16 w-16 text-zinc-700 mb-4" />
            <h3 className="text-lg font-medium text-zinc-300">No projects yet</h3>
            <p className="text-sm text-zinc-500 mt-1 max-w-sm">
              Create your first project to start producing AI-powered films.
              Drop an idea on the canvas and watch the AI crew bring it to life.
            </p>
            <button
              onClick={() => setIsCreating(true)}
              className="mt-4 flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="h-4 w-4" />
              Create First Project
            </button>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-center">
            <Search className="h-8 w-8 text-zinc-600 mb-2" />
            <p className="text-sm text-zinc-400">No projects match your search</p>
            <button
              onClick={() => { setSearch(''); setStatusFilter(null); }}
              className="mt-2 text-xs text-amber-500 hover:text-amber-400"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProjects.map((project) => (
              <button
                key={project.id}
                onClick={() => router.push(`/project/${project.id}`)}
                className="group text-left bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 hover:bg-zinc-800/50 transition-all"
              >
                {/* Title row */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Clapperboard className="h-4 w-4 text-amber-500 shrink-0" />
                    <h3 className="font-semibold text-white group-hover:text-amber-400 transition-colors truncate">
                      {project.name}
                    </h3>
                  </div>
                  <ChevronRight className="h-4 w-4 text-zinc-600 group-hover:text-zinc-400 transition-colors mt-0.5 shrink-0" />
                </div>

                {/* Description */}
                {project.description && (
                  <p className="text-sm text-zinc-500 mt-1.5 line-clamp-2">
                    {project.description}
                  </p>
                )}

                {/* Stats row */}
                <div className="flex items-center gap-4 mt-3 text-xs">
                  <span className={`px-2 py-0.5 rounded-full font-medium ${STATUS_CONFIG[project.status]?.color ?? STATUS_CONFIG.draft.color}`}>
                    {STATUS_CONFIG[project.status]?.label ?? project.status}
                  </span>

                  {project.stats.scenes > 0 && (
                    <span className="flex items-center gap-1 text-zinc-500">
                      <Layers className="h-3 w-3" />
                      {project.stats.scenes} scene{project.stats.scenes !== 1 ? 's' : ''}
                    </span>
                  )}

                  {project.stats.completed > 0 && (
                    <span className="flex items-center gap-1 text-green-500">
                      <CheckCircle2 className="h-3 w-3" />
                      {project.stats.completed}
                    </span>
                  )}
                  {project.stats.active > 0 && (
                    <span className="flex items-center gap-1 text-blue-400">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      {project.stats.active}
                    </span>
                  )}
                  {project.stats.failed > 0 && (
                    <span className="flex items-center gap-1 text-red-400">
                      <AlertCircle className="h-3 w-3" />
                      {project.stats.failed}
                    </span>
                  )}
                </div>

                {/* Pipeline progress bar */}
                <PipelineProgress stats={project.stats} />

                {/* Timestamp */}
                <div className="flex items-center gap-1 mt-3 text-xs text-zinc-600">
                  <Clock className="h-3 w-3" />
                  Updated {new Date(project.updatedAt).toLocaleDateString()}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
