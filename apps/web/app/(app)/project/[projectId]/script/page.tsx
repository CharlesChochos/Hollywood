'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import {
  FileText,
  Clapperboard,
  ChevronDown,
  ChevronRight,
  Heart,
  RefreshCw,
  Loader2,
  Clock,
  MessageSquare,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';

export default function ScriptPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  const scriptsQuery = trpc.script.getByProject.useQuery({ projectId });
  const utils = trpc.useUtils();

  const selectScript = trpc.script.select.useMutation({
    onSuccess: () => utils.script.getByProject.invalidate({ projectId }),
  });

  const scripts = scriptsQuery.data ?? [];
  const selectedScript = scripts.find((s) => s.isSelected) ?? scripts[0];

  if (scriptsQuery.isLoading) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="h-6 w-6 text-zinc-600 animate-spin" /></div>;
  }

  if (scripts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <FileText className="h-16 w-16 text-zinc-800 mb-4" />
        <h2 className="text-lg font-medium text-zinc-400">No Scripts Yet</h2>
        <p className="text-sm text-zinc-600 mt-2 max-w-md">
          Add an idea on the Director&apos;s Map to generate your first script.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {/* Script header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold text-zinc-200">{selectedScript?.title ?? 'Untitled'}</h1>
            {selectedScript?.logline && (
              <p className="text-sm text-zinc-500 mt-1 italic">{selectedScript.logline}</p>
            )}
          </div>

          {/* Version selector */}
          {scripts.length > 1 && (
            <div className="flex items-center gap-2">
              {scripts.map((script) => (
                <button
                  key={script.id}
                  onClick={() => selectScript.mutate({ id: script.id })}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                    script.id === selectedScript?.id
                      ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                      : 'bg-zinc-800/50 text-zinc-500 border-zinc-700 hover:text-zinc-300'
                  }`}
                >
                  v{script.versionNumber}
                  {script.isSelected && <Heart className="h-3 w-3 fill-rose-400 text-rose-400" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Scenes */}
        {selectedScript && <SceneList scriptId={selectedScript.id} />}
      </div>
    </div>
  );
}

function SceneList({ scriptId }: { scriptId: string }) {
  const scenesQuery = trpc.scene.getByScript.useQuery({ scriptId });
  const scenes = scenesQuery.data ?? [];

  if (scenesQuery.isLoading) return <Loader2 className="h-5 w-5 text-zinc-600 animate-spin mx-auto mt-8" />;

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
        Scenes ({scenes.length})
      </h2>
      {scenes.map((scene) => (
        <SceneCard key={scene.id} scene={scene} />
      ))}
    </div>
  );
}

function SceneCard({ scene }: { scene: any }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      {/* Scene header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-zinc-800/50 transition-colors"
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-zinc-600 shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-zinc-600 shrink-0" />
        )}
        <Clapperboard className="h-4 w-4 text-purple-400 shrink-0" />
        <div className="min-w-0 flex-1">
          <span className="text-sm font-medium text-zinc-200">
            Scene {scene.sceneNumber}
          </span>
          <span className="text-sm text-zinc-500 ml-2">{scene.heading}</span>
        </div>
        <div className="flex items-center gap-3 shrink-0 text-xs text-zinc-600">
          {scene.duration && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {scene.duration}s
            </span>
          )}
          {scene.dialogue?.length > 0 && (
            <span className="flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              {scene.dialogue.length}
            </span>
          )}
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 pt-1 border-t border-zinc-800 space-y-3">
          {/* Description */}
          <p className="text-sm text-zinc-400">{scene.description}</p>

          {/* Emotional beat */}
          {scene.emotionalBeat && (
            <p className="text-xs text-zinc-600 italic">Emotional beat: {scene.emotionalBeat}</p>
          )}

          {/* Dialogue */}
          {scene.dialogue?.length > 0 && (
            <div className="space-y-2 pt-2">
              <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Dialogue</h4>
              {scene.dialogue.map((line: any, i: number) => (
                <div key={i} className="pl-4 border-l-2 border-zinc-800">
                  <p className="text-xs font-medium text-zinc-400 uppercase">{line.characterId || 'Unknown'}</p>
                  {line.direction && (
                    <p className="text-xs text-zinc-600 italic">({line.direction})</p>
                  )}
                  <p className="text-sm text-zinc-300">{line.line}</p>
                </div>
              ))}
            </div>
          )}

          {/* Pipeline status */}
          <div className="flex items-center gap-3 pt-2">
            <PipelineBadge label="Storyboard" count={scene.storyboardFrames?.length ?? 0} />
            <PipelineBadge label="Voice" count={scene.voiceTracks?.length ?? 0} />
            <PipelineBadge label="Video" count={scene.videoSegments?.length ?? 0} />
          </div>
        </div>
      )}
    </div>
  );
}

function PipelineBadge({ label, count }: { label: string; count: number }) {
  const hasContent = count > 0;
  return (
    <span className={`text-xs px-2 py-0.5 rounded ${
      hasContent ? 'bg-green-500/10 text-green-400' : 'bg-zinc-800 text-zinc-600'
    }`}>
      {label}: {count}
    </span>
  );
}
