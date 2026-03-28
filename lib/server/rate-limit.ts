import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  redis = new Redis({ url, token });
  return redis;
}

// Pre-configured rate limiters for different route categories
const limiters = new Map<string, Ratelimit>();

function getLimiter(name: string, maxRequests: number, windowSeconds: number): Ratelimit | null {
  const r = getRedis();
  if (!r) return null;
  const key = `${name}:${maxRequests}:${windowSeconds}`;
  if (limiters.has(key)) return limiters.get(key)!;
  const limiter = new Ratelimit({
    redis: r,
    limiter: Ratelimit.slidingWindow(maxRequests, `${windowSeconds} s`),
    prefix: `rl:${name}`,
  });
  limiters.set(key, limiter);
  return limiter;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetMs: number;
}

/**
 * Check rate limit for a given identifier (usually userId or IP).
 * Returns { allowed: true } if Redis is not configured (graceful degradation).
 */
export async function checkRateLimit(
  route: string,
  identifier: string,
  maxRequests: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const limiter = getLimiter(route, maxRequests, windowSeconds);
  if (!limiter) {
    return { allowed: true, remaining: maxRequests, resetMs: 0 };
  }
  const result = await limiter.limit(identifier);
  return {
    allowed: result.success,
    remaining: result.remaining,
    resetMs: result.reset,
  };
}

/**
 * Helper to create a 429 response with rate limit headers.
 */
export function rateLimitResponse(result: RateLimitResult): Response {
  return new Response(
    JSON.stringify({ error: 'RATE_LIMITED', message: 'Too many requests. Please try again later.' }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'X-RateLimit-Remaining': String(result.remaining),
        'Retry-After': String(Math.ceil((result.resetMs - Date.now()) / 1000)),
      },
    },
  );
}
