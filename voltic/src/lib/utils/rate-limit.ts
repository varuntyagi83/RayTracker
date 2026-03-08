/**
 * Rate limiting with Upstash Redis (multi-instance) ↔ in-memory fallback.
 *
 * - When UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN are set:
 *   uses @upstash/ratelimit with a sliding window counter stored in Redis.
 *   Safe across multiple Vercel lambda instances.
 * - Otherwise: falls back to in-memory sliding window.
 *   Correct for single-instance dev / test environments.
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

interface RateLimitResult {
  success: boolean;
  remaining: number;
}

// ─── Synchronous In-Memory Limiter ──────────────────────────────────────────
// Kept for unit tests and as the local-dev fallback.

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

// ─── Upstash Singletons ──────────────────────────────────────────────────────

let _redis: Redis | null | undefined; // undefined = not yet initialized

function getRedis(): Redis | null {
  if (_redis !== undefined) return _redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  _redis = url && token ? new Redis({ url, token }) : null;
  return _redis;
}

// Cache Ratelimit instances keyed by "windowMs:limit" to avoid re-creating
// them on every request (each instance holds its own Redis pipeline config).
const _upstashLimiters = new Map<string, Ratelimit>();

function getUpstashLimiter(windowMs: number, limit: number): Ratelimit {
  const key = `${windowMs}:${limit}`;
  if (!_upstashLimiters.has(key)) {
    _upstashLimiters.set(
      key,
      new Ratelimit({
        redis: getRedis()!,
        limiter: Ratelimit.slidingWindow(limit, `${Math.round(windowMs / 1000)} s`),
        prefix: "voltic:rl",
      })
    );
  }
  return _upstashLimiters.get(key)!;
}

// ─── Async Multi-Instance Limiter ────────────────────────────────────────────

export class AsyncRateLimiter {
  private windowMs: number;
  private fallback: RateLimiter;

  constructor(windowMs: number) {
    this.windowMs = windowMs;
    this.fallback = new RateLimiter(windowMs);
  }

  async check(identifier: string, limit: number): Promise<RateLimitResult> {
    const redis = getRedis();
    if (redis) {
      const upstash = getUpstashLimiter(this.windowMs, limit);
      const result = await upstash.limit(identifier);
      return { success: result.success, remaining: result.remaining };
    }
    return this.fallback.check(identifier, limit);
  }
}

// ─── Presets ──────────────────────────────────────────────────────────────

/** General API: 60 requests per minute */
export const apiLimiter = new AsyncRateLimiter(60_000);

/** AI endpoints (LLM/image gen): 20 requests per minute */
export const aiLimiter = new AsyncRateLimiter(60_000);

/** Auth endpoints: 10 requests per minute */
export const authLimiter = new AsyncRateLimiter(60_000);
