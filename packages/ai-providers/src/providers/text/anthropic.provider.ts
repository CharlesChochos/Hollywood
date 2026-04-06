import Anthropic from '@anthropic-ai/sdk';
import type { TextGenerationProvider, TextGenOptions } from '../../types';

export class AnthropicTextProvider implements TextGenerationProvider {
  readonly name = 'anthropic';
  private client: Anthropic;

  constructor(apiKey?: string) {
    this.client = new Anthropic({ apiKey: apiKey ?? process.env.ANTHROPIC_API_KEY });
  }

  async generateText(prompt: string, options?: TextGenOptions): Promise<string> {
    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: options?.maxTokens ?? 4096,
      system: options?.systemPrompt ?? 'You are a creative screenwriter and filmmaker. Always respond with valid JSON when asked for structured output.',
      messages: [{ role: 'user', content: prompt }],
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    return textBlock?.text ?? '';
  }

  async *streamText(prompt: string, options?: TextGenOptions): AsyncIterable<string> {
    const stream = this.client.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: options?.maxTokens ?? 4096,
      system: options?.systemPrompt ?? 'You are a creative screenwriter and filmmaker.',
      messages: [{ role: 'user', content: prompt }],
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        yield event.delta.text;
      }
    }
  }
}
