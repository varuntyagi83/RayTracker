/**
 * In-memory sliding window rate limiter.
 * Suitable for single-instance deployments. For multi-instance,
 * swap with @upstash/ratelimit + Redis.
 */

interface RateLimitResult {
  success: boolean;
  remaining: number;
}

export class RateLimiter {
  private windowMs: number;
  private tokens: Map<string, number[]> = new Map();

  constructor(windowMs: number) {
    this.windowMs = windowMs;
  }

  check(identifier: string, limit: number): RateLimitResult {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // Get existing timestamps, filter to current window
    const timestamps = (this.tokens.get(identifier) ?? []).filter(
      (t) => t > windowStart
    );

    if (timestamps.length >= limit) {
      this.tokens.set(identifier, timestamps);
      return { success: false, remaining: 0 };
    }

    timestamps.push(now);
    this.tokens.set(identifier, timestamps);

    // Periodic cleanup: remove stale keys every ~100 calls
    if (Math.random() < 0.01) {
      this.cleanup(windowStart);
    }

    return { success: true, remaining: limit - timestamps.length };
  }

  private cleanup(windowStart: number) {
    for (const [key, timestamps] of this.tokens) {
      const active = timestamps.filter((t) => t > windowStart);
      if (active.length === 0) {
        this.tokens.delete(key);
      } else {
        this.tokens.set(key, active);
      }
    }
  }
}

// ─── Presets ──────────────────────────────────────────────────────────────

/** General API: 60 requests per minute */
export const apiLimiter = new RateLimiter(60_000);

/** AI endpoints (LLM/image gen): 20 requests per minute */
export const aiLimiter = new RateLimiter(60_000);

/** Auth endpoints: 10 requests per minute */
export const authLimiter = new RateLimiter(60_000);
