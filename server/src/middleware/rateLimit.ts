import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';

interface RateLimitEntry {
  count: number;
  firstRequest: number;
  blocked: boolean;
  blockUntil?: number;
}

interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  blockDurationMs?: number; // How long to block after exceeding limit
  keyGenerator?: (req: Request) => string; // Custom key generator
  skipSuccessfulRequests?: boolean; // Don't count successful requests
  message?: string; // Custom error message
}

// In-memory store for rate limiting
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    // Remove entries older than 1 hour
    if (now - entry.firstRequest > 60 * 60 * 1000) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000); // Run every 5 minutes

// Default key generator - uses IP address
const defaultKeyGenerator = (req: Request): string => {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = forwarded
    ? (Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0])
    : req.ip || req.socket.remoteAddress || 'unknown';
  return ip;
};

export function rateLimit(options: RateLimitOptions) {
  const {
    windowMs,
    maxRequests,
    blockDurationMs = windowMs * 2,
    keyGenerator = defaultKeyGenerator,
    message = 'Too many requests. Please try again later.',
  } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = keyGenerator(req);
    const now = Date.now();

    let entry = rateLimitStore.get(key);

    // Check if blocked
    if (entry?.blocked && entry.blockUntil && now < entry.blockUntil) {
      const retryAfter = Math.ceil((entry.blockUntil - now) / 1000);
      res.set('Retry-After', String(retryAfter));
      res.set('X-RateLimit-Limit', String(maxRequests));
      res.set('X-RateLimit-Remaining', '0');
      res.set('X-RateLimit-Reset', String(Math.ceil(entry.blockUntil / 1000)));

      logger.warn(`Rate limit blocked request from ${key}`);

      res.status(429).json({
        error: 'Too Many Requests',
        message,
        retryAfter,
      });
      return;
    }

    // Reset if window has passed
    if (!entry || now - entry.firstRequest > windowMs) {
      entry = {
        count: 0,
        firstRequest: now,
        blocked: false,
      };
    }

    // Increment count
    entry.count++;
    rateLimitStore.set(key, entry);

    // Calculate remaining
    const remaining = Math.max(0, maxRequests - entry.count);
    const resetTime = entry.firstRequest + windowMs;

    // Set rate limit headers
    res.set('X-RateLimit-Limit', String(maxRequests));
    res.set('X-RateLimit-Remaining', String(remaining));
    res.set('X-RateLimit-Reset', String(Math.ceil(resetTime / 1000)));

    // Check if limit exceeded
    if (entry.count > maxRequests) {
      entry.blocked = true;
      entry.blockUntil = now + blockDurationMs;
      rateLimitStore.set(key, entry);

      const retryAfter = Math.ceil(blockDurationMs / 1000);
      res.set('Retry-After', String(retryAfter));

      logger.warn(`Rate limit exceeded for ${key}: ${entry.count} requests`);

      res.status(429).json({
        error: 'Too Many Requests',
        message,
        retryAfter,
      });
      return;
    }

    next();
    return;
  };
}

// Pre-configured rate limiters for different use cases

// General API rate limit - 100 requests per minute
export const generalRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100,
  message: 'Too many requests. Please slow down.',
});

// Auth rate limit - 5 attempts per 15 minutes (stricter for login/register)
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5,
  blockDurationMs: 30 * 60 * 1000, // Block for 30 minutes
  message: 'Too many authentication attempts. Please try again in 30 minutes.',
  keyGenerator: (req) => {
    const ip = defaultKeyGenerator(req);
    const email = req.body?.email?.toLowerCase() || '';
    return `auth:${ip}:${email}`;
  },
});

// Booking creation rate limit - 20 bookings per hour
export const bookingRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 20,
  message: 'You have created too many bookings. Please try again later.',
  keyGenerator: (req) => {
    const userId = (req as Request & { user?: { id: string } }).user?.id || defaultKeyGenerator(req);
    return `booking:${userId}`;
  },
});

// Password reset rate limit - 3 requests per hour
export const passwordResetRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 3,
  blockDurationMs: 2 * 60 * 60 * 1000, // Block for 2 hours
  message: 'Too many password reset requests. Please try again later.',
});

// Export rate limit - 10 exports per hour
export const exportRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 10,
  message: 'Too many export requests. Please try again later.',
  keyGenerator: (req) => {
    const userId = (req as Request & { user?: { id: string } }).user?.id || defaultKeyGenerator(req);
    return `export:${userId}`;
  },
});
