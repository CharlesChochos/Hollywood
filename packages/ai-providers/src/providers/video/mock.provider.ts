import type { VideoGenerationProvider, VideoGenInput, VideoGenOptions } from '../../types';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class MockVideoProvider implements VideoGenerationProvider {
  readonly name = 'mock-video';

  async generateVideo(input: VideoGenInput, options?: VideoGenOptions): Promise<Buffer> {
    // Video generation is the slowest step — simulate 3-5 seconds
    await delay(3000 + Math.random() * 2000);

    // Return a minimal placeholder (in reality this would be an MP4)
    // For mock purposes we return a small buffer that represents "video generated"
    const metadata = JSON.stringify({
      mock: true,
      frames: input.frames.length,
      hasAudio: !!input.audio,
      duration: input.durationSeconds ?? 5,
      resolution: `${options?.width ?? 1920}x${options?.height ?? 1080}`,
      fps: options?.fps ?? 24,
      generatedAt: new Date().toISOString(),
    });

    return Buffer.from(metadata, 'utf-8');
  }
}
