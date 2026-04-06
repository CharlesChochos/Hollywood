'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import {
  Users,
  User,
  RefreshCw,
  Loader2,
  Sparkles,
  X,
  Save,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';

export default function CharactersPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  const charsQuery = trpc.character.getByProject.useQuery({ projectId });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const characters = charsQuery.data ?? [];

  if (charsQuery.isLoading) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="h-6 w-6 text-zinc-600 animate-spin" /></div>;
  }

  if (characters.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <Users className="h-16 w-16 text-zinc-800 mb-4" />
        <h2 className="text-lg font-medium text-zinc-400">No Characters Yet</h2>
        <p className="text-sm text-zinc-600 mt-2 max-w-md">
          Characters are generated automatically when the Script Writer agent produces a screenplay.
        </p>
      </div>
    );
  }

  const selected = characters.find((c) => c.id === selectedId);

  return (
    <div className="h-full flex">
      {/* Gallery Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="flex items-center gap-3 mb-6">
          <Users className="h-6 w-6 text-emerald-400" />
          <h1 className="text-xl font-semibold text-zinc-200">Characters</h1>
          <span className="text-sm text-zinc-500">({characters.length})</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {characters.map((char) => (
            <button
              key={char.id}
              onClick={() => setSelectedId(char.id === selectedId ? null : char.id)}
              className={`bg-zinc-900 border rounded-xl p-4 text-left transition-colors hover:border-zinc-600 ${
                char.id === selectedId ? 'border-emerald-500/40 ring-1 ring-emerald-500/20' : 'border-zinc-800'
              }`}
            >
              {/* Avatar placeholder */}
              <div className="aspect-square bg-zinc-800 rounded-lg border border-zinc-700 mb-3 flex items-center justify-center">
                {char.referenceAssetId ? (
                  <Sparkles className="h-8 w-8 text-emerald-600" />
                ) : (
                  <User className="h-8 w-8 text-zinc-700" />
                )}
              </div>
              <p className="text-sm font-medium text-zinc-200 truncate">{char.name}</p>
              <p className="text-xs text-zinc-500 truncate mt-0.5">{char.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Detail Panel */}
      {selected && (
        <CharacterDetailPanel
          character={selected}
          projectId={projectId}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}

function CharacterDetailPanel({ character, projectId, onClose }: { character: any; projectId: string; onClose: () => void }) {
  const utils = trpc.useUtils();
  const [name, setName] = useState(character.name);
  const [description, setDescription] = useState(character.description);
  const [personality, setPersonality] = useState(character.personality ?? '');

  const updateChar = trpc.character.update.useMutation({
    onSuccess: () => utils.character.getByProject.invalidate({ projectId }),
  });

  const regenerate = trpc.character.regenerate.useMutation({
    onSuccess: () => utils.agent.getByProject.invalidate({ projectId }),
  });

  const handleSave = () => {
    updateChar.mutate({ id: character.id, name, description, personality });
  };

  return (
    <div className="w-80 border-l border-zinc-800 bg-zinc-950 overflow-y-auto">
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-300">Character Details</h2>
          <button onClick={onClose} className="text-zinc-600 hover:text-zinc-400">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Avatar */}
        <div className="aspect-square bg-zinc-800 rounded-xl border border-zinc-700 flex items-center justify-center">
          {character.referenceAssetId ? (
            <Sparkles className="h-12 w-12 text-emerald-600" />
          ) : (
            <User className="h-12 w-12 text-zinc-700" />
          )}
        </div>

        {/* Editable fields */}
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-zinc-500 mb-1 block">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-500 mb-1 block">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 resize-none focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-500 mb-1 block">Personality</label>
            <textarea
              value={personality}
              onChange={(e) => setPersonality(e.target.value)}
              rows={2}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 resize-none focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
            />
          </div>
        </div>

        {/* Voice & Visual Profile */}
        {character.voiceProfile && (
          <div>
            <label className="text-xs font-medium text-zinc-500 mb-1 block">Voice Profile</label>
            <div className="text-xs text-zinc-600 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2">
              Provider: {(character.voiceProfile as any)?.provider ?? 'default'}
            </div>
          </div>
        )}

        {character.visualProfile && (
          <div>
            <label className="text-xs font-medium text-zinc-500 mb-1 block">Visual Style</label>
            <div className="text-xs text-zinc-600 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2">
              Art Style: {(character.visualProfile as any)?.artStyle ?? 'default'}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <button
            onClick={handleSave}
            disabled={updateChar.isPending}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium bg-zinc-800 text-zinc-300 rounded-lg border border-zinc-700 hover:bg-zinc-700 transition-colors disabled:opacity-40"
          >
            <Save className="h-3 w-3" />
            Save
          </button>
          <button
            onClick={() => regenerate.mutate({ characterId: character.id })}
            disabled={regenerate.isPending}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors disabled:opacity-40"
          >
            {regenerate.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            Regenerate
          </button>
        </div>
      </div>
    </div>
  );
}
