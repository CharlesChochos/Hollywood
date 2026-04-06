import type { AudioGenerationProvider, VoiceProfile, AudioGenOptions } from '../../types';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Generate a minimal WAV file header for silence
function generateSilentWav(durationSeconds: number, sampleRate = 22050): Buffer {
  const numSamples = Math.floor(sampleRate * durationSeconds);
  const dataSize = numSamples * 2; // 16-bit mono
  const headerSize = 44;
  const buffer = Buffer.alloc(headerSize + dataSize);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);

  // fmt chunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // chunk size
  buffer.writeUInt16LE(1, 20);  // PCM
  buffer.writeUInt16LE(1, 22);  // mono
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28); // byte rate
  buffer.writeUInt16LE(2, 32);  // block align
  buffer.writeUInt16LE(16, 34); // bits per sample

  // data chunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  // Remaining bytes are zero (silence)

  return buffer;
}

export class MockAudioProvider implements AudioGenerationProvider {
  readonly name = 'mock-audio';

  async generateSpeech(text: string, voice: VoiceProfile, options?: AudioGenOptions): Promise<Buffer> {
    await delay(1000);
    // Estimate duration: ~150 words per minute
    const wordCount = text.split(/\s+/).length;
    const durationSeconds = Math.max(1, (wordCount / 150) * 60);
    return generateSilentWav(durationSeconds);
  }
}
