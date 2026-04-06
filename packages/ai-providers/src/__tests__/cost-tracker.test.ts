import { describe, it, expect } from 'vitest';
import { costTracker } from '../cost-tracker';

describe('costTracker', () => {
  it('tracks text generation costs', () => {
    const entry = costTracker.trackTextGeneration({
      provider: 'anthropic',
      model: 'claude-sonnet-4',
      inputTokens: 1000,
      outputTokens: 500,
      projectId: 'proj-1',
    });

    expect(entry.operation).toBe('text');
    expect(entry.provider).toBe('anthropic');
    expect(entry.estimatedCostUsd).toBeGreaterThan(0);
    // 1000 input tokens at $3/1M = $0.003, 500 output at $15/1M = $0.0075
    expect(entry.estimatedCostUsd).toBeCloseTo(0.003 + 0.0075, 4);
  });

  it('tracks image generation costs', () => {
    const entry = costTracker.trackImageGeneration({
      provider: 'openai-image',
      model: 'dall-e-3',
      count: 2,
      quality: 'standard',
      projectId: 'proj-1',
    });

    expect(entry.operation).toBe('image');
    expect(entry.units).toBe(2);
    expect(entry.estimatedCostUsd).toBeCloseTo(0.08, 2); // 2 * $0.04
  });

  it('tracks audio generation costs', () => {
    const entry = costTracker.trackAudioGeneration({
      provider: 'openai-tts',
      model: 'tts-1',
      characterCount: 500,
      projectId: 'proj-1',
    });

    expect(entry.operation).toBe('audio');
    expect(entry.estimatedCostUsd).toBeGreaterThan(0);
  });

  it('filters entries by projectId', () => {
    costTracker.trackTextGeneration({
      provider: 'openai',
      model: 'gpt-4o',
      inputTokens: 100,
      outputTokens: 100,
      projectId: 'proj-other',
    });

    const entries = costTracker.getEntries({ projectId: 'proj-other' });
    expect(entries.length).toBeGreaterThan(0);
    expect(entries.every((e) => e.projectId === 'proj-other')).toBe(true);
  });

  it('calculates total cost', () => {
    const total = costTracker.getTotalCost();
    expect(total).toBeGreaterThan(0);
  });

  it('generates summary with breakdowns', () => {
    const summary = costTracker.getSummary();
    expect(summary.total).toBeGreaterThan(0);
    expect(summary.entryCount).toBeGreaterThan(0);
    expect(summary.byProvider).toBeDefined();
    expect(summary.byOperation).toBeDefined();
  });
});
