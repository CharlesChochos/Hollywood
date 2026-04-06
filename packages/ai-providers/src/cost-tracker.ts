/**
 * Per-provider cost tracking for AI API usage.
 * Stores running totals in memory — persisted to DB by the caller if needed.
 */

export interface CostEntry {
  provider: string;
  operation: 'text' | 'image' | 'audio' | 'video';
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  units?: number;         // images, audio seconds, video seconds
  estimatedCostUsd: number;
  timestamp: Date;
  projectId?: string;
  jobId?: string;
}

// Approximate pricing per unit (USD) — update as providers change pricing
const PRICING: Record<string, Record<string, number>> = {
  // Text: per 1M tokens
  'anthropic': { input: 3.0, output: 15.0 },
  'openai': { input: 2.5, output: 10.0 },
  // Image: per image
  'openai-image': { standard: 0.04, hd: 0.08 },
  'stability': { image: 0.002 },
  // Audio: per 1M characters
  'openai-tts': { char: 15.0 },
  'elevenlabs': { char: 18.0 },
  // Video: per second
  'mock-video': { second: 0.0 },
  'runway': { second: 0.05 },  // ~$0.05/sec for Gen-3 Alpha Turbo
};

const entries: CostEntry[] = [];

export const costTracker = {
  trackTextGeneration(opts: {
    provider: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    projectId?: string;
    jobId?: string;
  }) {
    const pricing = PRICING[opts.provider];
    const inputCost = pricing ? (opts.inputTokens / 1_000_000) * (pricing.input ?? 0) : 0;
    const outputCost = pricing ? (opts.outputTokens / 1_000_000) * (pricing.output ?? 0) : 0;

    const entry: CostEntry = {
      provider: opts.provider,
      operation: 'text',
      model: opts.model,
      inputTokens: opts.inputTokens,
      outputTokens: opts.outputTokens,
      estimatedCostUsd: inputCost + outputCost,
      timestamp: new Date(),
      projectId: opts.projectId,
      jobId: opts.jobId,
    };
    entries.push(entry);
    return entry;
  },

  trackImageGeneration(opts: {
    provider: string;
    model: string;
    count?: number;
    quality?: 'standard' | 'hd';
    projectId?: string;
    jobId?: string;
  }) {
    const count = opts.count ?? 1;
    const pricing = PRICING[opts.provider];
    const perImage = pricing?.[opts.quality ?? 'standard'] ?? pricing?.image ?? 0;

    const entry: CostEntry = {
      provider: opts.provider,
      operation: 'image',
      model: opts.model,
      units: count,
      estimatedCostUsd: perImage * count,
      timestamp: new Date(),
      projectId: opts.projectId,
      jobId: opts.jobId,
    };
    entries.push(entry);
    return entry;
  },

  trackAudioGeneration(opts: {
    provider: string;
    model: string;
    characterCount: number;
    projectId?: string;
    jobId?: string;
  }) {
    const pricing = PRICING[opts.provider];
    const cost = pricing ? (opts.characterCount / 1_000_000) * (pricing.char ?? 0) : 0;

    const entry: CostEntry = {
      provider: opts.provider,
      operation: 'audio',
      model: opts.model,
      units: opts.characterCount,
      estimatedCostUsd: cost,
      timestamp: new Date(),
      projectId: opts.projectId,
      jobId: opts.jobId,
    };
    entries.push(entry);
    return entry;
  },

  getEntries(filter?: { projectId?: string; provider?: string; operation?: string }) {
    return entries.filter(e => {
      if (filter?.projectId && e.projectId !== filter.projectId) return false;
      if (filter?.provider && e.provider !== filter.provider) return false;
      if (filter?.operation && e.operation !== filter.operation) return false;
      return true;
    });
  },

  getTotalCost(filter?: { projectId?: string; provider?: string }): number {
    return this.getEntries(filter).reduce((sum, e) => sum + e.estimatedCostUsd, 0);
  },

  getSummary(projectId?: string) {
    const relevant = projectId ? entries.filter(e => e.projectId === projectId) : entries;
    const byProvider: Record<string, number> = {};
    const byOperation: Record<string, number> = {};
    let total = 0;

    for (const e of relevant) {
      byProvider[e.provider] = (byProvider[e.provider] ?? 0) + e.estimatedCostUsd;
      byOperation[e.operation] = (byOperation[e.operation] ?? 0) + e.estimatedCostUsd;
      total += e.estimatedCostUsd;
    }

    return { total, byProvider, byOperation, entryCount: relevant.length };
  },
};
