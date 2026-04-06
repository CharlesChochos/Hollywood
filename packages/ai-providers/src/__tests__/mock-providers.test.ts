import { describe, it, expect } from 'vitest';
import { MockTextProvider } from '../providers/text/mock.provider';
import { MockImageProvider } from '../providers/image/mock.provider';
import { MockAudioProvider } from '../providers/audio/mock.provider';
import { MockVideoProvider } from '../providers/video/mock.provider';

describe('MockTextProvider', () => {
  const provider = new MockTextProvider();

  it('has correct name', () => {
    expect(provider.name).toBe('mock-text');
  });

  it('generates a mock script when prompt contains "screenplay"', async () => {
    const result = await provider.generateText('Generate a screenplay about robots');
    const parsed = JSON.parse(result);
    expect(parsed).toHaveProperty('title');
    expect(parsed).toHaveProperty('logline');
    expect(parsed.scenes).toBeInstanceOf(Array);
    expect(parsed.scenes.length).toBeGreaterThan(0);
    expect(parsed.characters).toBeInstanceOf(Array);
    expect(parsed.characters.length).toBeGreaterThan(0);
  });

  it('generates mock EDL when prompt contains "edit decision"', async () => {
    const result = await provider.generateText('Create an edit decision list');
    const parsed = JSON.parse(result);
    expect(parsed).toHaveProperty('transitions');
    expect(parsed).toHaveProperty('colorGrade');
  });

  it('generates mock social copy when prompt contains "marketing"', async () => {
    const result = await provider.generateText('Write marketing social media copy');
    const parsed = JSON.parse(result);
    expect(parsed).toHaveProperty('trailer_tagline');
    expect(parsed).toHaveProperty('twitter_post');
  });

  it('returns generic response for unrecognized prompts', async () => {
    const result = await provider.generateText('Hello world');
    expect(result).toContain('[Mock AI Response]');
  });

  it('streams text word by word', async () => {
    const chunks: string[] = [];
    for await (const chunk of provider.streamText('Hello world')) {
      chunks.push(chunk);
    }
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks.join('')).toContain('Mock AI Response');
  });
});

describe('MockImageProvider', () => {
  const provider = new MockImageProvider();

  it('has correct name', () => {
    expect(provider.name).toBe('mock-image');
  });

  it('generates an SVG buffer', async () => {
    const result = await provider.generateImage('A robot in a garden');
    expect(result).toBeInstanceOf(Buffer);
    const svg = result.toString('utf-8');
    expect(svg).toContain('<svg');
    expect(svg).toContain('Mock Frame');
  });

  it('respects width/height options', async () => {
    const result = await provider.generateImage('test', { width: 512, height: 512 });
    const svg = result.toString('utf-8');
    expect(svg).toContain('512x512');
  });
});

describe('MockAudioProvider', () => {
  const provider = new MockAudioProvider();

  it('has correct name', () => {
    expect(provider.name).toBe('mock-audio');
  });

  it('generates a WAV buffer', async () => {
    const voice = { id: 'v1', name: 'test', settings: {} };
    const result = await provider.generateSpeech('Hello there', voice);
    expect(result).toBeInstanceOf(Buffer);
    // Check RIFF header
    expect(result.toString('ascii', 0, 4)).toBe('RIFF');
    expect(result.toString('ascii', 8, 12)).toBe('WAVE');
  });

  it('generates longer audio for longer text', async () => {
    const voice = { id: 'v1', name: 'test', settings: {} };
    const short = await provider.generateSpeech('Hi', voice);
    const long = await provider.generateSpeech(
      'This is a much longer piece of text that should result in a longer audio duration because it has many more words in it',
      voice,
    );
    expect(long.length).toBeGreaterThan(short.length);
  });
});

describe('MockVideoProvider', () => {
  const provider = new MockVideoProvider();

  it('has correct name', () => {
    expect(provider.name).toBe('mock-video');
  });

  it('generates a buffer', async () => {
    const result = await provider.generateVideo({
      frames: [Buffer.from('frame1')],
      prompt: 'test video',
    });
    expect(result).toBeInstanceOf(Buffer);
    expect(result.length).toBeGreaterThan(0);
  });
});
