'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Film, Clock, ChevronRight } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { trpc } from '@/lib/trpc';

export default function DashboardPage() {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');

  const projectsQuery = trpc.project.list.useQuery();
  const createProject = trpc.project.create.useMutation({
    onSuccess: (project) => {
      setIsCreating(false);
      setNewName('');
      projectsQuery.refetch();
      router.push(`/project/${project!.id}`);
    },
  });

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

        {/* Create Project Modal */}
        {isCreating && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold text-white mb-4">New Project</h3>
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Enter project name..."
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newName.trim()) {
                    createProject.mutate({ name: newName.trim() });
                  }
                  if (e.key === 'Escape') setIsCreating(false);
                }}
              />
              <div className="flex justify-end gap-3 mt-4">
                <button
                  onClick={() => setIsCreating(false)}
                  className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => newName.trim() && createProject.mutate({ name: newName.trim() })}
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
        ) : projectsQuery.data?.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Film className="h-16 w-16 text-zinc-700 mb-4" />
            <h3 className="text-lg font-medium text-zinc-300">No projects yet</h3>
            <p className="text-sm text-zinc-500 mt-1">
              Create your first project to start producing AI-powered films
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projectsQuery.data?.map((project) => (
              <button
                key={project.id}
                onClick={() => router.push(`/project/${project.id}`)}
                className="group text-left bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 hover:bg-zinc-800/50 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-white group-hover:text-amber-400 transition-colors">
                      {project.name}
                    </h3>
                    {project.description && (
                      <p className="text-sm text-zinc-500 mt-1 line-clamp-2">
                        {project.description}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 text-zinc-600 group-hover:text-zinc-400 transition-colors mt-1" />
                </div>
                <div className="flex items-center gap-3 mt-4">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    project.status === 'draft' ? 'bg-zinc-800 text-zinc-400' :
                    project.status === 'in_progress' ? 'bg-blue-900/50 text-blue-400' :
                    project.status === 'published' ? 'bg-green-900/50 text-green-400' :
                    'bg-zinc-800 text-zinc-400'
                  }`}>
                    {project.status}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-zinc-600">
                    <Clock className="h-3 w-3" />
                    {new Date(project.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
