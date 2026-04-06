import type { AudioGenerationProvider, VoiceProfile, AudioGenOptions } from '../../types';

export class ElevenLabsProvider implements AudioGenerationProvider {
  readonly name = 'elevenlabs';
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey ?? process.env.ELEVENLABS_API_KEY ?? '';
  }

  async generateSpeech(text: string, voice: VoiceProfile, options?: AudioGenOptions): Promise<Buffer> {
    // Use voice ID from profile, or fall back to a default voice
    const voiceId = (voice.settings as Record<string, unknown>)?.elevenLabsVoiceId as string
      ?? 'pNInz6obpgDQGcFmaJgB'; // default: Adam

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': this.apiKey,
          Accept: 'audio/mpeg',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            speed: options?.speed ?? 1.0,
          },
        }),
      },
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`ElevenLabs error (${response.status}): ${error}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
}
