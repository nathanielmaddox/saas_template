/**
 * Enterprise-grade rate limiting implementation
 * Supports multiple algorithms and storage backends
 */

import { Redis } from '@upstash/redis';

// Redis client for production rate limiting
let redis: Redis | null = null;

if (process.env.REDIS_URL) {
  try {
    redis = new Redis({
      url: process.env.REDIS_URL,
      token: process.env.REDIS_TOKEN
    });
  } catch (error) {
    console.warn('Redis connection failed, falling back to in-memory rate limiting:', error);
  }
}

// In-memory store for development/fallback
const memoryStore = new Map<string, { count: number; resetTime: number }>();

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
  retryAfter?: number;
}

interface RateLimitOptions {
  requests: number;
  window: string;
  key: string;
  algorithm?: 'sliding-window' | 'fixed-window' | 'token-bucket';
}

/**
 * Main rate limiting function
 */
export async function ratelimit(
  requests: number,
  window: string,
  key: string,
  algorithm: 'sliding-window' | 'fixed-window' | 'token-bucket' = 'sliding-window'
): Promise<RateLimitResult> {
  const windowMs = parseWindow(window);

  try {
    if (redis) {
      return await redisRateLimit(requests, windowMs, key, algorithm);
    } else {
      return await memoryRateLimit(requests, windowMs, key, algorithm);
    }
  } catch (error) {
    console.error('Rate limiting error:', error);
    // Fail open - allow request if rate limiting fails
    return {
      success: true,
      limit: requests,
      remaining: requests - 1,
      reset: Date.now() + windowMs
    };
  }
}

/**
 * Redis-based rate limiting (production)
 */
async function redisRateLimit(
  requests: number,
  windowMs: number,
  key: string,
  algorithm: string
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowStart = now - windowMs;

  switch (algorithm) {
    case 'sliding-window':
      return await slidingWindowRedis(requests, windowMs, key, now, windowStart);
    case 'fixed-window':
      return await fixedWindowRedis(requests, windowMs, key, now);
    case 'token-bucket':
      return await tokenBucketRedis(requests, windowMs, key, now);
    default:
      throw new Error(`Unknown algorithm: ${algorithm}`);
  }
}

/**
 * Sliding window rate limiting with Redis
 */
async function slidingWindowRedis(
  requests: number,
  windowMs: number,
  key: string,
  now: number,
  windowStart: number
): Promise<RateLimitResult> {
  const pipeline = redis!.pipeline();

  // Remove expired entries
  pipeline.zremrangebyscore(key, 0, windowStart);

  // Count current requests in window
  pipeline.zcard(key);

  // Add current request
  pipeline.zadd(key, { score: now, member: `${now}-${Math.random()}` });

  // Set expiration
  pipeline.expire(key, Math.ceil(windowMs / 1000));

  const results = await pipeline.exec() as [null, number][];
  const currentCount = (results[1]?.[1] || 0) + 1; // +1 for current request

  const success = currentCount <= requests;
  const remaining = Math.max(0, requests - currentCount);
  const reset = now + windowMs;

  return {
    success,
    limit: requests,
    remaining,
    reset,
    retryAfter: success ? undefined : Math.ceil(windowMs / 1000)
  };
}

/**
 * Fixed window rate limiting with Redis
 */
async function fixedWindowRedis(
  requests: number,
  windowMs: number,
  key: string,
  now: number
): Promise<RateLimitResult> {
  const windowStart = Math.floor(now / windowMs) * windowMs;
  const windowKey = `${key}:${windowStart}`;

  const current = await redis!.incr(windowKey);

  if (current === 1) {
    await redis!.expire(windowKey, Math.ceil(windowMs / 1000));
  }

  const success = current <= requests;
  const remaining = Math.max(0, requests - current);
  const reset = windowStart + windowMs;

  return {
    success,
    limit: requests,
    remaining,
    reset,
    retryAfter: success ? undefined : Math.ceil((reset - now) / 1000)
  };
}

/**
 * Token bucket rate limiting with Redis
 */
async function tokenBucketRedis(
  capacity: number,
  refillMs: number,
  key: string,
  now: number
): Promise<RateLimitResult> {
  const bucketKey = `bucket:${key}`;
  const refillRate = capacity / refillMs; // tokens per ms

  // Get current bucket state
  const result = await redis!.hmget(bucketKey, 'tokens', 'lastRefill');
  let tokens = parseFloat(result[0] || capacity.toString());
  const lastRefill = parseInt(result[1] || now.toString());

  // Calculate tokens to add based on time elapsed
  const timePassed = now - lastRefill;
  const tokensToAdd = timePassed * refillRate;
  tokens = Math.min(capacity, tokens + tokensToAdd);

  const success = tokens >= 1;

  if (success) {
    tokens -= 1;
  }

  // Update bucket state
  await redis!.hmset(bucketKey, {
    tokens: tokens.toString(),
    lastRefill: now.toString()
  });
  await redis!.expire(bucketKey, Math.ceil(refillMs / 1000) * 2);

  const remaining = Math.floor(tokens);
  const reset = now + Math.ceil((capacity - tokens) / refillRate);

  return {
    success,
    limit: capacity,
    remaining,
    reset,
    retryAfter: success ? undefined : Math.ceil((1 - tokens) / refillRate / 1000)
  };
}

/**
 * In-memory rate limiting (development/fallback)
 */
async function memoryRateLimit(
  requests: number,
  windowMs: number,
  key: string,
  algorithm: string
): Promise<RateLimitResult> {
  const now = Date.now();

  switch (algorithm) {
    case 'sliding-window':
    case 'fixed-window':
      return fixedWindowMemory(requests, windowMs, key, now);
    case 'token-bucket':
      return tokenBucketMemory(requests, windowMs, key, now);
    default:
      throw new Error(`Unknown algorithm: ${algorithm}`);
  }
}

/**
 * Fixed window rate limiting with in-memory store
 */
function fixedWindowMemory(
  requests: number,
  windowMs: number,
  key: string,
  now: number
): RateLimitResult {
  const windowStart = Math.floor(now / windowMs) * windowMs;
  const windowKey = `${key}:${windowStart}`;

  let entry = memoryStore.get(windowKey);
  if (!entry || entry.resetTime < now) {
    entry = { count: 0, resetTime: windowStart + windowMs };
  }

  entry.count++;
  memoryStore.set(windowKey, entry);

  // Cleanup old entries
  cleanupMemoryStore(now);

  const success = entry.count <= requests;
  const remaining = Math.max(0, requests - entry.count);

  return {
    success,
    limit: requests,
    remaining,
    reset: entry.resetTime,
    retryAfter: success ? undefined : Math.ceil((entry.resetTime - now) / 1000)
  };
}

/**
 * Token bucket rate limiting with in-memory store
 */
function tokenBucketMemory(
  capacity: number,
  refillMs: number,
  key: string,
  now: number
): RateLimitResult {
  const bucketKey = `bucket:${key}`;
  const refillRate = capacity / refillMs; // tokens per ms

  let entry = memoryStore.get(bucketKey);
  if (!entry) {
    entry = { count: capacity, resetTime: now };
  }

  // Calculate tokens to add based on time elapsed
  const timePassed = now - entry.resetTime;
  const tokensToAdd = timePassed * refillRate;
  let tokens = Math.min(capacity, entry.count + tokensToAdd);

  const success = tokens >= 1;

  if (success) {
    tokens -= 1;
  }

  // Update bucket state
  entry.count = tokens;
  entry.resetTime = now;
  memoryStore.set(bucketKey, entry);

  // Cleanup old entries
  cleanupMemoryStore(now);

  const remaining = Math.floor(tokens);
  const reset = now + Math.ceil((capacity - tokens) / refillRate);

  return {
    success,
    limit: capacity,
    remaining,
    reset,
    retryAfter: success ? undefined : Math.ceil((1 - tokens) / refillRate / 1000)
  };
}

/**
 * Cleanup expired entries from memory store
 */
function cleanupMemoryStore(now: number) {
  for (const [key, entry] of memoryStore.entries()) {
    if (entry.resetTime < now - 60000) { // Remove entries older than 1 minute
      memoryStore.delete(key);
    }
  }
}

/**
 * Parse window string to milliseconds
 */
function parseWindow(window: string): number {
  const match = window.match(/^(\d+)([smhd])$/);
  if (!match) {
    throw new Error(`Invalid window format: ${window}`);
  }

  const [, amount, unit] = match;
  const value = parseInt(amount, 10);

  switch (unit) {
    case 's': return value * 1000;
    case 'm': return value * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    case 'd': return value * 24 * 60 * 60 * 1000;
    default: throw new Error(`Invalid time unit: ${unit}`);
  }
}

/**
 * Rate limit middleware factory
 */
export function createRateLimiter(options: RateLimitOptions) {
  return async (identifier: string) => {
    const key = `${options.key}:${identifier}`;
    return await ratelimit(
      options.requests,
      options.window,
      key,
      options.algorithm
    );
  };
}

/**
 * Rate limit decorator for API routes
 */
export function rateLimitDecorator(options: RateLimitOptions) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (req: any, res: any, ...args: any[]) {
      const identifier = req.ip || req.headers['x-forwarded-for'] || 'unknown';
      const key = `${options.key}:${identifier}`;

      const result = await ratelimit(
        options.requests,
        options.window,
        key,
        options.algorithm
      );

      // Add rate limit headers
      res.setHeader('X-RateLimit-Limit', result.limit);
      res.setHeader('X-RateLimit-Remaining', result.remaining);
      res.setHeader('X-RateLimit-Reset', result.reset);

      if (!result.success) {
        if (result.retryAfter) {
          res.setHeader('Retry-After', result.retryAfter);
        }
        return res.status(429).json({
          error: 'Rate limit exceeded',
          retryAfter: result.retryAfter
        });
      }

      return method.apply(this, [req, res, ...args]);
    };

    return descriptor;
  };
}

// Preset rate limiters for common use cases
export const rateLimiters = {
  // Authentication endpoints - very strict
  auth: createRateLimiter({
    requests: 5,
    window: '15m',
    key: 'auth',
    algorithm: 'sliding-window'
  }),

  // General API endpoints
  api: createRateLimiter({
    requests: 100,
    window: '1m',
    key: 'api',
    algorithm: 'sliding-window'
  }),

  // File uploads - moderate
  upload: createRateLimiter({
    requests: 10,
    window: '1m',
    key: 'upload',
    algorithm: 'token-bucket'
  }),

  // Password reset - very strict
  passwordReset: createRateLimiter({
    requests: 3,
    window: '1h',
    key: 'password-reset',
    algorithm: 'fixed-window'
  }),

  // Email sending - moderate
  email: createRateLimiter({
    requests: 20,
    window: '1h',
    key: 'email',
    algorithm: 'token-bucket'
  })
};