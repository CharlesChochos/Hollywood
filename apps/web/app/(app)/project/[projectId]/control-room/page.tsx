'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { SlidersHorizontal, Zap, Save, RotateCcw, Sparkles } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { VibeSlider } from '@/components/control-room/VibeSlider';
import { VibeSelector } from '@/components/control-room/VibeSelector';
import type { VibeSettings, ArtStyle, ColorGrade, LightingMood, CameraMovement, CameraAngle } from '@hollywood/types';
import { DEFAULT_VIBE_SETTINGS } from '@hollywood/types';

const STYLE_PRESETS: Record<string, Partial<VibeSettings>> = {
  'Film Noir': {
    pacing: 35, cutFrequency: 30, colorGrade: 'noir', colorTemperature: 25,
    saturation: 20, contrast: 80, artStyle: 'realistic', lightingMood: 'dramatic',
    cameraMovement: 'steady', emotionalIntensity: 70, dialoguePace: 40, musicIntensity: 55,
  },
  'Summer Blockbuster': {
    pacing: 80, cutFrequency: 75, colorGrade: 'vibrant', colorTemperature: 65,
    saturation: 80, contrast: 60, artStyle: 'pixar', lightingMood: 'natural',
    cameraMovement: 'dynamic', emotionalIntensity: 75, dialoguePace: 70, musicIntensity: 85,
  },
  'Indie Drama': {
    pacing: 30, cutFrequency: 20, colorGrade: 'muted', colorTemperature: 45,
    saturation: 40, contrast: 45, artStyle: 'realistic', lightingMood: 'soft',
    cameraMovement: 'handheld', emotionalIntensity: 60, dialoguePace: 35, musicIntensity: 30,
  },
  'Anime Action': {
    pacing: 85, cutFrequency: 80, colorGrade: 'vibrant', colorTemperature: 50,
    saturation: 90, contrast: 70, artStyle: 'anime', lightingMood: 'neon',
    cameraMovement: 'dynamic', emotionalIntensity: 85, dialoguePace: 75, musicIntensity: 90,
  },
  'Watercolor Dream': {
    pacing: 25, cutFrequency: 15, colorGrade: 'pastel', colorTemperature: 55,
    saturation: 50, contrast: 30, artStyle: 'watercolor', lightingMood: 'golden_hour',
    cameraMovement: 'steady', emotionalIntensity: 40, dialoguePace: 25, musicIntensity: 35,
  },
};

const ART_STYLE_OPTIONS: { value: ArtStyle; label: string }[] = [
  { value: 'pixar', label: 'Pixar' },
  { value: 'anime', label: 'Anime' },
  { value: 'watercolor', label: 'Watercolor' },
  { value: 'realistic', label: 'Realistic' },
  { value: 'comic', label: 'Comic' },
];

const COLOR_GRADE_OPTIONS: { value: ColorGrade; label: string }[] = [
  { value: 'noir', label: 'Noir' },
  { value: 'vibrant', label: 'Vibrant' },
  { value: 'pastel', label: 'Pastel' },
  { value: 'muted', label: 'Muted' },
];

const LIGHTING_OPTIONS: { value: LightingMood; label: string }[] = [
  { value: 'natural', label: 'Natural' },
  { value: 'dramatic', label: 'Dramatic' },
  { value: 'soft', label: 'Soft' },
  { value: 'neon', label: 'Neon' },
  { value: 'golden_hour', label: 'Golden Hour' },
];

const CAMERA_OPTIONS: { value: CameraMovement; label: string }[] = [
  { value: 'static', label: 'Static' },
  { value: 'handheld', label: 'Handheld' },
  { value: 'steady', label: 'Steady' },
  { value: 'dynamic', label: 'Dynamic' },
];

export default function ControlRoomPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  const projectQuery = trpc.project.getById.useQuery({ id: projectId });
  const updateVibes = trpc.project.updateVibes.useMutation();
  const enqueueAgent = trpc.agent.enqueue.useMutation();
  const utils = trpc.useUtils();

  const [vibes, setVibes] = useState<VibeSettings>(DEFAULT_VIBE_SETTINGS);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (projectQuery.data?.vibeSettings) {
      setVibes(projectQuery.data.vibeSettings);
    }
  }, [projectQuery.data]);

  const update = <K extends keyof VibeSettings>(key: K, value: VibeSettings[K]) => {
    setVibes((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    updateVibes.mutate(
      { id: projectId, vibeSettings: vibes },
      { onSuccess: () => { setHasChanges(false); utils.project.getById.invalidate({ id: projectId }); } },
    );
  };

  const handlePreset = (presetName: string) => {
    const preset = STYLE_PRESETS[presetName];
    if (preset) {
      setVibes((prev) => ({ ...prev, ...preset }));
      setHasChanges(true);
    }
  };

  const handleReset = () => {
    setVibes(DEFAULT_VIBE_SETTINGS);
    setHasChanges(true);
  };

  const handlePropagate = () => {
    handleSave();
    // Re-enqueue storyboard and video agents for affected scenes
    enqueueAgent.mutate({
      projectId,
      agentType: 'storyboard_creator',
      payload: { regenerateAll: true, vibeSettings: vibes },
    });
  };

  if (projectQuery.isLoading) {
    return <div className="flex items-center justify-center h-full text-zinc-500">Loading...</div>;
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <SlidersHorizontal className="h-6 w-6 text-amber-400" />
            <h1 className="text-xl font-semibold text-zinc-200">Control Room</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges || updateVibes.isPending}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium bg-zinc-800 text-zinc-300 rounded-lg border border-zinc-700 hover:bg-zinc-700 transition-colors disabled:opacity-40"
            >
              <Save className="h-3 w-3" />
              Save
            </button>
            <button
              onClick={handlePropagate}
              disabled={!hasChanges}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium bg-amber-500/10 text-amber-400 rounded-lg border border-amber-500/20 hover:bg-amber-500/20 transition-colors disabled:opacity-40"
            >
              <Zap className="h-3 w-3" />
              Propagate Changes
            </button>
          </div>
        </div>

        {/* Style Presets */}
        <section>
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">Style Presets</h2>
          <div className="flex flex-wrap gap-2">
            {Object.keys(STYLE_PRESETS).map((name) => (
              <button
                key={name}
                onClick={() => handlePreset(name)}
                className="flex items-center gap-1.5 px-4 py-2 text-sm bg-zinc-800/50 text-zinc-400 rounded-lg border border-zinc-700 hover:bg-zinc-800 hover:text-zinc-200 hover:border-zinc-600 transition-colors"
              >
                <Sparkles className="h-3 w-3" />
                {name}
              </button>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Pacing & Timing */}
          <section className="space-y-5">
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Pacing & Timing</h2>
            <VibeSlider label="Pacing" value={vibes.pacing} onChange={(v) => update('pacing', v)} leftLabel="Glacial" rightLabel="Frenetic" />
            <VibeSlider label="Cut Frequency" value={vibes.cutFrequency} onChange={(v) => update('cutFrequency', v)} leftLabel="Long takes" rightLabel="Rapid cuts" />
            <VibeSlider label="Dialogue Pace" value={vibes.dialoguePace} onChange={(v) => update('dialoguePace', v)} leftLabel="Contemplative" rightLabel="Snappy" />
          </section>

          {/* Visual Style */}
          <section className="space-y-5">
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Visual Style</h2>
            <VibeSelector label="Art Style" value={vibes.artStyle} onChange={(v) => update('artStyle', v)} options={ART_STYLE_OPTIONS} />
            <VibeSelector label="Color Grade" value={vibes.colorGrade} onChange={(v) => update('colorGrade', v)} options={COLOR_GRADE_OPTIONS} />
            <VibeSlider label="Color Temperature" value={vibes.colorTemperature} onChange={(v) => update('colorTemperature', v)} leftLabel="Cool" rightLabel="Warm" />
          </section>

          {/* Color & Contrast */}
          <section className="space-y-5">
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Color & Contrast</h2>
            <VibeSlider label="Saturation" value={vibes.saturation} onChange={(v) => update('saturation', v)} leftLabel="Desaturated" rightLabel="Vivid" />
            <VibeSlider label="Contrast" value={vibes.contrast} onChange={(v) => update('contrast', v)} leftLabel="Flat" rightLabel="High contrast" />
          </section>

          {/* Camera & Lighting */}
          <section className="space-y-5">
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Camera & Lighting</h2>
            <VibeSelector label="Lighting Mood" value={vibes.lightingMood} onChange={(v) => update('lightingMood', v)} options={LIGHTING_OPTIONS} />
            <VibeSelector label="Camera Movement" value={vibes.cameraMovement} onChange={(v) => update('cameraMovement', v)} options={CAMERA_OPTIONS} />
          </section>

          {/* Emotional */}
          <section className="space-y-5 md:col-span-2">
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Emotional</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <VibeSlider label="Emotional Intensity" value={vibes.emotionalIntensity} onChange={(v) => update('emotionalIntensity', v)} leftLabel="Subtle" rightLabel="Melodramatic" />
              <VibeSlider label="Music Intensity" value={vibes.musicIntensity} onChange={(v) => update('musicIntensity', v)} leftLabel="Ambient" rightLabel="Bombastic" />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
