import type { AgentType, VibeSettings, ProviderConfig } from '@hollywood/types';

export interface BaseJobPayload {
  jobId: string;
  projectId: string;
  agentType: AgentType;
  vibeSettings: VibeSettings;
  providerConfig: ProviderConfig;
}

export interface ScriptWriterPayload extends BaseJobPayload {
  agentType: 'script_writer';
  ideaId: string;
  ideaText: string;
  genre?: string;
  targetDuration?: number;
  tone?: string;
}

export interface StoryboardCreatorPayload extends BaseJobPayload {
  agentType: 'storyboard_creator';
  sceneId: string;
  sceneDescription: string;
  dialogue?: string;
  artStyle: string;
}

export interface CharacterGeneratorPayload extends BaseJobPayload {
  agentType: 'character_generator';
  characterId: string;
  description: string;
  personality?: string;
  artStyle: string;
}

export interface VoiceActorPayload extends BaseJobPayload {
  agentType: 'voice_actor';
  sceneId: string;
  lines: Array<{
    characterId: string;
    text: string;
    emotion?: string;
  }>;
}

export interface VideoGeneratorPayload extends BaseJobPayload {
  agentType: 'video_generator';
  sceneId: string;
  storyboardFrameIds: string[];
  voiceTrackIds: string[];
}

export interface EditingPayload extends BaseJobPayload {
  agentType: 'editing';
  videoSegmentIds: string[];
}

export interface MarketingPayload extends BaseJobPayload {
  agentType: 'marketing';
  finalCutId: string;
  targetPlatforms: string[];
}

export type JobPayload =
  | ScriptWriterPayload
  | StoryboardCreatorPayload
  | CharacterGeneratorPayload
  | VoiceActorPayload
  | VideoGeneratorPayload
  | EditingPayload
  | MarketingPayload;
