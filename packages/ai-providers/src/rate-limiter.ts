/**
 * Token-bucket rate limiter for AI provider API calls.
 * Prevents hitting provider rate limits and manages costs.
 */

interface RateLimiterConfig {
  maxTokensPerMinute: number;
  maxRequestsPerMinute: number;
}

const PROVIDER_LIMITS: Record<string, RateLimiterConfig> = {
  anthropic:     { maxTokensPerMinute: 80_000,  maxRequestsPerMinute: 50 },
  openai:        { maxTokensPerMinute: 150_000, maxRequestsPerMinute: 60 },
  'openai-image': { maxTokensPerMinute: Infinity, maxRequestsPerMinute: 7 },
  stability:     { maxTokensPerMinute: Infinity, maxRequestsPerMinute: 10 },
  'openai-tts':  { maxTokensPerMinute: Infinity, maxRequestsPerMinute: 20 },
  elevenlabs:    { maxTokensPerMinute: Infinity, maxRequestsPerMinute: 10 },
  runway:        { maxTokensPerMinute: Infinity, maxRequestsPerMinute: 5 },
};

interface BucketState {
  requests: number[];  // timestamps of recent requests
}

const buckets = new Map<string, BucketState>();

function getBucket(provider: string): BucketState {
  let bucket = buckets.get(provider);
  if (!bucket) {
    bucket = { requests: [] };
    buckets.set(provider, bucket);
  }
  return bucket;
}

function pruneOldRequests(bucket: BucketState, windowMs: number) {
  const cutoff = Date.now() - windowMs;
  bucket.requests = bucket.requests.filter(t => t > cutoff);
}

/**
 * Wait until the rate limiter allows a request for the given provider.
 * Returns immediately if under limits; blocks if at capacity.
 */
export async function waitForRateLimit(provider: string): Promise<void> {
  const limits = PROVIDER_LIMITS[provider];
  if (!limits) return; // No limits configured — allow immediately

  const bucket = getBucket(provider);
  const windowMs = 60_000;

  while (true) {
    pruneOldRequests(bucket, windowMs);

    if (bucket.requests.length < limits.maxRequestsPerMinute) {
      bucket.requests.push(Date.now());
      return;
    }

    // Wait until the oldest request falls out of the window
    const oldestRequest = bucket.requests[0]!;
    const waitMs = oldestRequest + windowMs - Date.now() + 50; // 50ms buffer
    await new Promise(resolve => setTimeout(resolve, Math.max(waitMs, 100)));
  }
}

/**
 * Get current rate limit status for a provider.
 */
export function getRateLimitStatus(provider: string) {
  const limits = PROVIDER_LIMITS[provider];
  if (!limits) return null;

  const bucket = getBucket(provider);
  pruneOldRequests(bucket, 60_000);

  return {
    provider,
    requestsInWindow: bucket.requests.length,
    maxRequestsPerMinute: limits.maxRequestsPerMinute,
    remainingRequests: limits.maxRequestsPerMinute - bucket.requests.length,
  };
}
