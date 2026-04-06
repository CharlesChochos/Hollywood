// ── Text Generation (Scripts, edit decisions, social copy) ──

export interface TextGenOptions {
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}

export interface TextGenerationProvider {
  readonly name: string;
  generateText(prompt: string, options?: TextGenOptions): Promise<string>;
  streamText(prompt: string, options?: TextGenOptions): AsyncIterable<string>;
}

// ── Image Generation (Storyboards, character sheets, thumbnails) ──

export interface ImageGenOptions {
  width?: number;
  height?: number;
  style?: string;
  negativePrompt?: string;
}

export interface ImageGenerationProvider {
  readonly name: string;
  generateImage(prompt: string, options?: ImageGenOptions): Promise<Buffer>;
}

// ── Audio Generation (Voice acting, narration) ──

export interface VoiceProfile {
  id: string;
  name: string;
  settings: Record<string, unknown>;
}

export interface AudioGenOptions {
  speed?: number;
  pitch?: number;
}

export interface AudioGenerationProvider {
  readonly name: string;
  generateSpeech(text: string, voice: VoiceProfile, options?: AudioGenOptions): Promise<Buffer>;
}

// ── Video Generation (Scene animation) ──

export interface VideoGenInput {
  frames: Buffer[];
  audio?: Buffer;
  prompt?: string;
  durationSeconds?: number;
}

export interface VideoGenOptions {
  width?: number;
  height?: number;
  fps?: number;
}

export interface VideoGenerationProvider {
  readonly name: string;
  generateVideo(input: VideoGenInput, options?: VideoGenOptions): Promise<Buffer>;
}
