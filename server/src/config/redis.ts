import { Redis } from 'ioredis';
import { config } from './index.js';

let redis: Redis | null = null;
let redisAvailable = false;

export function isRedisAvailable(): boolean {
  return redisAvailable;
}

export function getRedis(): Redis | null {
  if (!config.redis.url || config.redis.url === 'redis://localhost:6379') {
    // Redis not configured or using default local URL in serverless
    return null;
  }

  if (!redis) {
    try {
      redis = new Redis(config.redis.url, {
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        lazyConnect: true,
      });

      redis.on('error', (err: Error) => {
        console.error('Redis error:', err);
        redisAvailable = false;
      });

      redis.on('connect', () => {
        console.log('✅ Redis connected');
        redisAvailable = true;
      });
    } catch (error) {
      console.warn('Redis not available:', error);
      return null;
    }
  }
  return redis;
}

export async function disconnectRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
    redisAvailable = false;
    console.log('Redis disconnected');
  }
}
