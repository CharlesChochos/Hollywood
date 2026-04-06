export type AgentType =
  | 'script_writer'
  | 'storyboard_creator'
  | 'character_generator'
  | 'voice_actor'
  | 'video_generator'
  | 'editing'
  | 'marketing';

export type JobStatus = 'queued' | 'active' | 'completed' | 'failed' | 'stalled';

export interface AssetReference {
  assetId: string;
  type: string;
  s3Key: string;
}

export interface EnqueueRequest {
  agentType: AgentType;
  payload: unknown;
  projectId: string;
  targetEntityType?: string;
  targetEntityId?: string;
  prerequisites?: Array<{
    agentType: AgentType;
    entityId: string;
  }>;
}

export interface AgentInput<T = unknown> {
  jobId: string;
  projectId: string;
  payload: T;
  vibeSettings: import('./vibe.types').VibeSettings;
  providerConfig: ProviderConfig;
}

export interface AgentOutput<T = unknown> {
  success: boolean;
  result?: T;
  assets?: AssetReference[];
  nextJobs?: EnqueueRequest[];
  error?: string;
}

export interface AgentProgressCallback {
  (progress: number, message: string): Promise<void>;
}

export interface ProviderConfig {
  text: string;
  image: string;
  audio: string;
  video: string;
}

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

/**
 * Returns the best available provider config based on which API keys are set.
 * Falls back to mock providers when no keys are present.
 */
export function getDefaultProviderConfig(): ProviderConfig {
  return {
    text: process.env.ANTHROPIC_API_KEY
      ? 'anthropic'
      : process.env.OPENAI_API_KEY
        ? 'openai'
        : 'mock-text',
    image: process.env.OPENAI_API_KEY
      ? 'openai-image'
      : process.env.STABILITY_API_KEY
        ? 'stability'
        : 'mock-image',
    audio: process.env.ELEVENLABS_API_KEY
      ? 'elevenlabs'
      : process.env.OPENAI_API_KEY
        ? 'openai-tts'
        : 'mock-audio',
    video: process.env.RUNWAY_API_KEY ? 'runway' : 'mock-video',
  };
}

export interface Agent<TInput = unknown, TOutput = unknown> {
  readonly type: AgentType;
  readonly version: string;
  execute(
    input: AgentInput<TInput>,
    onProgress: AgentProgressCallback,
    signal: AbortSignal,
  ): Promise<AgentOutput<TOutput>>;
  validate(input: AgentInput<TInput>): ValidationResult;
}
