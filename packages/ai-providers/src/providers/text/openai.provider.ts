import OpenAI from 'openai';
import type { TextGenerationProvider, TextGenOptions } from '../../types';

export class OpenAITextProvider implements TextGenerationProvider {
  readonly name = 'openai';
  private client: OpenAI;

  constructor(apiKey?: string) {
    this.client = new OpenAI({ apiKey: apiKey ?? process.env.OPENAI_API_KEY });
  }

  async generateText(prompt: string, options?: TextGenOptions): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: options?.maxTokens ?? 4096,
      temperature: options?.temperature ?? 0.7,
      messages: [
        { role: 'system', content: options?.systemPrompt ?? 'You are a creative screenwriter. Always respond with valid JSON when asked for structured output.' },
        { role: 'user', content: prompt },
      ],
    });

    return response.choices[0]?.message?.content ?? '';
  }

  async *streamText(prompt: string, options?: TextGenOptions): AsyncIterable<string> {
    const stream = await this.client.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: options?.maxTokens ?? 4096,
      temperature: options?.temperature ?? 0.7,
      messages: [
        { role: 'system', content: options?.systemPrompt ?? 'You are a creative screenwriter.' },
        { role: 'user', content: prompt },
      ],
      stream: true,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) yield delta;
    }
  }
}
