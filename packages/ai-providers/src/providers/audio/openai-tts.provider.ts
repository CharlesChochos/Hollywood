import OpenAI from 'openai';
import type { AudioGenerationProvider, VoiceProfile, AudioGenOptions } from '../../types';

const VOICE_MAP: Record<string, 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer'> = {
  male_deep: 'onyx',
  male_neutral: 'echo',
  female_warm: 'nova',
  female_bright: 'shimmer',
  narrator: 'fable',
  default: 'alloy',
};

export class OpenAITTSProvider implements AudioGenerationProvider {
  readonly name = 'openai-tts';
  private client: OpenAI;

  constructor(apiKey?: string) {
    this.client = new OpenAI({ apiKey: apiKey ?? process.env.OPENAI_API_KEY });
  }

  async generateSpeech(text: string, voice: VoiceProfile, options?: AudioGenOptions): Promise<Buffer> {
    const voiceName = VOICE_MAP[voice.name] ?? VOICE_MAP[voice.id] ?? 'alloy';
    const speed = options?.speed ?? 1.0;

    const response = await this.client.audio.speech.create({
      model: 'tts-1',
      voice: voiceName,
      input: text,
      speed,
      response_format: 'wav',
    });

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
}
