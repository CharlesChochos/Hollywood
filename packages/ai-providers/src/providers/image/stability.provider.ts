import type { ImageGenerationProvider, ImageGenOptions } from '../../types';

export class StabilityImageProvider implements ImageGenerationProvider {
  readonly name = 'stability';
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey ?? process.env.STABILITY_API_KEY ?? '';
  }

  async generateImage(prompt: string, options?: ImageGenOptions): Promise<Buffer> {
    const width = options?.width ?? 1024;
    const height = options?.height ?? 768;

    const body: Record<string, unknown> = {
      text_prompts: [
        { text: prompt, weight: 1 },
        ...(options?.negativePrompt ? [{ text: options.negativePrompt, weight: -1 }] : []),
      ],
      cfg_scale: 7,
      width: this.snapToMultiple(width, 64),
      height: this.snapToMultiple(height, 64),
      steps: 30,
      samples: 1,
    };

    if (options?.style) {
      body.style_preset = options.style;
    }

    const response = await fetch(
      'https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
          Accept: 'application/json',
        },
        body: JSON.stringify(body),
      },
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Stability AI error (${response.status}): ${error}`);
    }

    const data = await response.json() as { artifacts: Array<{ base64: string }> };
    const b64 = data.artifacts[0]?.base64;
    if (!b64) throw new Error('No image data returned from Stability AI');

    return Buffer.from(b64, 'base64');
  }

  private snapToMultiple(value: number, multiple: number): number {
    return Math.round(value / multiple) * multiple;
  }
}
