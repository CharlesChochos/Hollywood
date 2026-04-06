'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { GitBranch, Heart, Sparkles, FileText, Image, Loader2 } from 'lucide-react';
import { trpc } from '@/lib/trpc';

type ReviewTab = 'scripts' | 'storyboards';

export default function ReviewPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const [activeTab, setActiveTab] = useState<ReviewTab>('scripts');

  const scriptsQuery = trpc.script.getByProject.useQuery({ projectId });
  const scenesQuery = trpc.scene.getByScript.useQuery(
    { scriptId: scriptsQuery.data?.[0]?.id ?? '' },
    { enabled: !!scriptsQuery.data?.[0] },
  );

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <GitBranch className="h-6 w-6 text-violet-400" />
            <h1 className="text-xl font-semibold text-zinc-200">Multiverse Review</h1>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-zinc-800">
          <TabButton active={activeTab === 'scripts'} onClick={() => setActiveTab('scripts')} icon={FileText} label="Scripts" />
          <TabButton active={activeTab === 'storyboards'} onClick={() => setActiveTab('storyboards')} icon={Image} label="Storyboards" />
        </div>

        {/* Content */}
        {activeTab === 'scripts' && (
          <ScriptReview projectId={projectId} scripts={scriptsQuery.data ?? []} isLoading={scriptsQuery.isLoading} />
        )}
        {activeTab === 'storyboards' && (
          <StoryboardReview
            projectId={projectId}
            scenes={scenesQuery.data ?? []}
            scriptId={scriptsQuery.data?.[0]?.id}
            isLoading={scenesQuery.isLoading}
          />
        )}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: React.ElementType; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
        active ? 'border-violet-500 text-violet-400' : 'border-transparent text-zinc-500 hover:text-zinc-300'
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function ScriptReview({ projectId, scripts, isLoading }: { projectId: string; scripts: any[]; isLoading: boolean }) {
  const utils = trpc.useUtils();
  const selectScript = trpc.script.select.useMutation({
    onSuccess: () => utils.script.getByProject.invalidate({ projectId }),
  });
  const regenerate = trpc.script.regenerate.useMutation({
    onSuccess: () => utils.script.getByProject.invalidate({ projectId }),
  });

  if (isLoading) return <LoadingState />;
  if (scripts.length === 0) return <EmptyState message="No scripts generated yet. Start by adding an idea on the Director's Map." />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-500">{scripts.length} version{scripts.length !== 1 ? 's' : ''}</p>
        {scripts[0] && (
          <button
            onClick={() => regenerate.mutate({ scriptId: scripts[0].id })}
            disabled={regenerate.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-violet-500/10 text-violet-400 rounded-lg border border-violet-500/20 hover:bg-violet-500/20 transition-colors disabled:opacity-40"
          >
            {regenerate.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
            Generate Alternative
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {scripts.map((script) => (
          <div
            key={script.id}
            className={`bg-zinc-900 border rounded-xl p-4 space-y-3 transition-colors ${
              script.isSelected ? 'border-rose-500/40 ring-1 ring-rose-500/20' : 'border-zinc-800'
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-200">{script.title}</p>
                <p className="text-xs text-zinc-500">v{script.versionNumber}</p>
              </div>
              <button
                onClick={() => selectScript.mutate({ id: script.id })}
                className={`p-1.5 rounded-lg transition-colors ${
                  script.isSelected
                    ? 'text-rose-400'
                    : 'text-zinc-600 hover:text-rose-400'
                }`}
              >
                <Heart className={`h-4 w-4 ${script.isSelected ? 'fill-current' : ''}`} />
              </button>
            </div>
            {script.logline && (
              <p className="text-xs text-zinc-400 line-clamp-3">{script.logline}</p>
            )}
            <div className="flex items-center gap-2">
              <span className={`text-xs px-1.5 py-0.5 rounded ${
                script.status === 'completed' ? 'bg-green-500/10 text-green-400' : 'bg-zinc-700/50 text-zinc-500'
              }`}>
                {script.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StoryboardReview({ projectId, scenes, scriptId, isLoading }: { projectId: string; scenes: any[]; scriptId?: string; isLoading: boolean }) {
  const storyboardRegenerate = trpc.storyboard.regenerate.useMutation();

  if (isLoading) return <LoadingState />;
  if (scenes.length === 0) return <EmptyState message="No scenes available. Generate a script first." />;

  return (
    <div className="space-y-6">
      {scenes.map((scene: any) => (
        <div key={scene.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-200">Scene {scene.sceneNumber}: {scene.heading}</p>
              <p className="text-xs text-zinc-500">{scene.emotionalBeat}</p>
            </div>
            <button
              onClick={() => storyboardRegenerate.mutate({ sceneId: scene.id })}
              disabled={storyboardRegenerate.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-violet-500/10 text-violet-400 rounded-lg border border-violet-500/20 hover:bg-violet-500/20 transition-colors disabled:opacity-40"
            >
              <Sparkles className="h-3 w-3" />
              Regenerate
            </button>
          </div>

          {/* Storyboard frames grid */}
          {scene.storyboardFrames?.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {scene.storyboardFrames.map((frame: any) => (
                <div key={frame.id} className="aspect-[4/3] bg-zinc-800 rounded-lg border border-zinc-700 flex items-center justify-center text-xs text-zinc-600">
                  <div className="text-center">
                    <Image className="h-6 w-6 mx-auto mb-1 text-zinc-700" />
                    <span>Frame {frame.frameNumber}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-4 text-center text-xs text-zinc-600">
              No storyboard frames yet
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="h-6 w-6 text-zinc-600 animate-spin" />
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <GitBranch className="h-12 w-12 text-zinc-800 mb-3" />
      <p className="text-sm text-zinc-500">{message}</p>
    </div>
  );
}
