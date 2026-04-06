/**
 * Retry strategies for AI provider calls with exponential backoff.
 */

export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  retryableErrors: string[];
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30_000,
  retryableErrors: [
    'ECONNRESET',
    'ETIMEDOUT',
    'rate_limit',
    '429',
    '500',
    '502',
    '503',
    '529',
  ],
};

function isRetryable(error: unknown, config: RetryConfig): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return config.retryableErrors.some(pattern => message.includes(pattern));
}

function calculateDelay(attempt: number, config: RetryConfig): number {
  // Exponential backoff with jitter
  const exponentialDelay = config.baseDelayMs * Math.pow(2, attempt);
  const jitter = Math.random() * config.baseDelayMs;
  return Math.min(exponentialDelay + jitter, config.maxDelayMs);
}

/**
 * Execute a function with retry logic.
 * Uses exponential backoff with jitter for transient failures.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {},
): Promise<T> {
  const mergedConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: unknown;

  for (let attempt = 0; attempt <= mergedConfig.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === mergedConfig.maxRetries || !isRetryable(error, mergedConfig)) {
        throw error;
      }

      const delay = calculateDelay(attempt, mergedConfig);
      console.log(
        `[retry] Attempt ${attempt + 1}/${mergedConfig.maxRetries} failed, retrying in ${Math.round(delay)}ms: ${error instanceof Error ? error.message : error}`,
      );
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
