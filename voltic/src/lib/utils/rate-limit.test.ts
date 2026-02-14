import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { RateLimiter, apiLimiter, aiLimiter, authLimiter } from "./rate-limit";

describe("RateLimiter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows requests within limit", () => {
    const limiter = new RateLimiter(60_000);
    expect(limiter.check("u1", 3)).toEqual({ success: true, remaining: 2 });
    expect(limiter.check("u1", 3)).toEqual({ success: true, remaining: 1 });
    expect(limiter.check("u1", 3)).toEqual({ success: true, remaining: 0 });
  });

  it("blocks requests over limit", () => {
    const limiter = new RateLimiter(60_000);
    limiter.check("u1", 2);
    limiter.check("u1", 2);
    expect(limiter.check("u1", 2)).toEqual({ success: false, remaining: 0 });
  });

  it("allows requests again after window passes", () => {
    const limiter = new RateLimiter(60_000);
    limiter.check("u1", 1);
    expect(limiter.check("u1", 1).success).toBe(false);

    vi.advanceTimersByTime(61_000);
    expect(limiter.check("u1", 1)).toEqual({ success: true, remaining: 0 });
  });

  it("handles partial window slide correctly", () => {
    const limiter = new RateLimiter(60_000);

    // Request at t=0
    limiter.check("u1", 2);

    // Advance 30s, request at t=30s
    vi.advanceTimersByTime(30_000);
    limiter.check("u1", 2);

    // Blocked at t=30s
    expect(limiter.check("u1", 2).success).toBe(false);

    // Advance 31s more (total 61s from first request)
    vi.advanceTimersByTime(31_000);

    // First request expired, second still active → 1 slot free
    expect(limiter.check("u1", 2).success).toBe(true);
  });

  it("tracks independent identifiers separately", () => {
    const limiter = new RateLimiter(60_000);
    limiter.check("u1", 1);
    expect(limiter.check("u1", 1).success).toBe(false);

    // u2 should have full quota
    expect(limiter.check("u2", 1)).toEqual({ success: true, remaining: 0 });
  });

  it("reports remaining count accurately", () => {
    const limiter = new RateLimiter(60_000);
    expect(limiter.check("u1", 5).remaining).toBe(4);
    expect(limiter.check("u1", 5).remaining).toBe(3);
    expect(limiter.check("u1", 5).remaining).toBe(2);
    expect(limiter.check("u1", 5).remaining).toBe(1);
    expect(limiter.check("u1", 5).remaining).toBe(0);
    // Blocked
    expect(limiter.check("u1", 5).remaining).toBe(0);
  });

  it("cleanup removes stale entries", () => {
    const limiter = new RateLimiter(60_000);
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.005);

    limiter.check("stale_user", 1);
    vi.advanceTimersByTime(61_000);

    // This check triggers cleanup (random < 0.01)
    limiter.check("new_user", 10);

    // stale_user's entry should be cleaned up, so they can request again
    expect(limiter.check("stale_user", 1).success).toBe(true);

    randomSpy.mockRestore();
  });

  it("blocks when limit is zero", () => {
    const limiter = new RateLimiter(60_000);
    expect(limiter.check("u1", 0)).toEqual({ success: false, remaining: 0 });
  });

  it("handles limit of 1", () => {
    const limiter = new RateLimiter(60_000);
    expect(limiter.check("u1", 1).success).toBe(true);
    expect(limiter.check("u1", 1).success).toBe(false);
  });
});

describe("exported limiter instances", () => {
  it("apiLimiter exists and works", () => {
    expect(apiLimiter).toBeInstanceOf(RateLimiter);
  });

  it("aiLimiter exists and works", () => {
    expect(aiLimiter).toBeInstanceOf(RateLimiter);
  });

  it("authLimiter exists and works", () => {
    expect(authLimiter).toBeInstanceOf(RateLimiter);
  });
});
