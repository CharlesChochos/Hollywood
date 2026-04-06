import type { VideoGenerationProvider, VideoGenInput, VideoGenOptions } from '../../types';

const RUNWAY_API_BASE = 'https://api.dev.runwayml.com/v1';

interface RunwayTaskResponse {
  id: string;
  status: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED';
  output?: string[];
  failure?: string;
}

export class RunwayVideoProvider implements VideoGenerationProvider {
  readonly name = 'runway';
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey ?? process.env.RUNWAY_API_KEY ?? '';
  }

  async generateVideo(input: VideoGenInput, options?: VideoGenOptions): Promise<Buffer> {
    const hasImage = input.frames.length > 0;

    // Build request body — use image-to-video if frames provided, otherwise text-to-video
    const body: Record<string, unknown> = {
      model: 'gen3a_turbo',
      duration: input.durationSeconds ?? 5,
      ratio: this.resolveRatio(options?.width, options?.height),
    };

    if (hasImage) {
      // Convert first frame to base64 data URI
      const frame = input.frames[0]!;
      const b64 = frame.toString('base64');
      const mimeType = this.detectMimeType(frame);
      body.promptImage = `data:${mimeType};base64,${b64}`;
      body.promptText = input.prompt ?? 'Animate this scene with cinematic camera movement';
    } else {
      body.promptText = input.prompt ?? 'A cinematic scene';
    }

    // Submit generation task
    const submitResponse = await fetch(`${RUNWAY_API_BASE}/image_to_video`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
        'X-Runway-Version': '2024-11-06',
      },
      body: JSON.stringify(body),
    });

    if (!submitResponse.ok) {
      const error = await submitResponse.text();
      throw new Error(`Runway submit error (${submitResponse.status}): ${error}`);
    }

    const { id: taskId } = await submitResponse.json() as { id: string };

    // Poll for completion
    const videoUrl = await this.pollForCompletion(taskId);

    // Download the video
    const videoResponse = await fetch(videoUrl);
    if (!videoResponse.ok) {
      throw new Error(`Failed to download Runway video: ${videoResponse.status}`);
    }

    const arrayBuffer = await videoResponse.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  private async pollForCompletion(taskId: string, maxWaitMs = 300_000): Promise<string> {
    const startTime = Date.now();
    const pollInterval = 5_000; // 5 seconds

    while (Date.now() - startTime < maxWaitMs) {
      await new Promise(resolve => setTimeout(resolve, pollInterval));

      const response = await fetch(`${RUNWAY_API_BASE}/tasks/${taskId}`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'X-Runway-Version': '2024-11-06',
        },
      });

      if (!response.ok) {
        throw new Error(`Runway poll error (${response.status}): ${await response.text()}`);
      }

      const task = await response.json() as RunwayTaskResponse;

      switch (task.status) {
        case 'SUCCEEDED':
          if (!task.output?.[0]) throw new Error('Runway returned no output URL');
          return task.output[0];
        case 'FAILED':
          throw new Error(`Runway generation failed: ${task.failure ?? 'unknown error'}`);
        case 'PENDING':
        case 'RUNNING':
          continue;
      }
    }

    throw new Error(`Runway generation timed out after ${maxWaitMs / 1000}s`);
  }

  private resolveRatio(width?: number, height?: number): '16:9' | '9:16' | '1:1' {
    if (width && height) {
      if (width > height * 1.2) return '16:9';
      if (height > width * 1.2) return '9:16';
    }
    return '16:9'; // default landscape
  }

  private detectMimeType(buffer: Buffer): string {
    // Check PNG magic bytes
    if (buffer[0] === 0x89 && buffer[1] === 0x50) return 'image/png';
    // Check JPEG magic bytes
    if (buffer[0] === 0xFF && buffer[1] === 0xD8) return 'image/jpeg';
    // SVG (starts with <)
    if (buffer[0] === 0x3C) return 'image/svg+xml';
    return 'image/png';
  }
}
