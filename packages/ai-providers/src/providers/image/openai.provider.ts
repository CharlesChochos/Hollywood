import OpenAI from 'openai';
import type { ImageGenerationProvider, ImageGenOptions } from '../../types';

export class OpenAIImageProvider implements ImageGenerationProvider {
  readonly name = 'openai-image';
  private client: OpenAI;

  constructor(apiKey?: string) {
    this.client = new OpenAI({ apiKey: apiKey ?? process.env.OPENAI_API_KEY });
  }

  async generateImage(prompt: string, options?: ImageGenOptions): Promise<Buffer> {
    const size = this.resolveSize(options?.width, options?.height);

    const response = await this.client.images.generate({
      model: 'dall-e-3',
      prompt: options?.style
        ? `${prompt}. Art style: ${options.style}`
        : prompt,
      n: 1,
      size,
      quality: 'standard',
      response_format: 'b64_json',
    });

    const b64 = response.data?.[0]?.b64_json;
    if (!b64) throw new Error('No image data returned from DALL-E');

    return Buffer.from(b64, 'base64');
  }

  private resolveSize(width?: number, height?: number): '1024x1024' | '1792x1024' | '1024x1792' {
    if (width && height) {
      if (width > height) return '1792x1024';
      if (height > width) return '1024x1792';
    }
    return '1024x1024';
  }
}
