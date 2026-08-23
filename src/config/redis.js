import Redis from 'ioredis';
import config from './index.js';
import { logger } from '../shared/index.js';

const CONNECT_TIMEOUT_MS = 5000;
const BOOT_TIMEOUT_MS = 5000;

let redisClient;

function initializeRedis() {
  if (!redisClient && config.redis.clusterUrls.length > 0) {
    const redisOptions = {
      password: config.redis.password,
      connectTimeout: CONNECT_TIMEOUT_MS,
      maxRetriesPerRequest: 1,
      retryStrategy: (times) => Math.min(times * 200, 2000),
    };

    if (config.redis.clusterUrls.length === 1) {
      redisClient = new Redis(config.redis.clusterUrls[0], redisOptions);
    } else {
      redisClient = new Redis.Cluster(
        config.redis.clusterUrls.map((url) => {
          const urlObj = new URL(url);
          return {
            host: urlObj.hostname,
            port: urlObj.port || 6379,
          };
        }),
        { redisOptions }
      );
    }

    redisClient.on('error', (error) => {
      logger.error(`Redis client error: ${error.message}`);
    });
  }
  return redisClient;
}

function getRedisClient() {
  if (!redisClient) {
    return initializeRedis();
  }
  return redisClient;
}

async function connectRedis() {
  if (config.redis.clusterUrls.length === 0) {
    return;
  }

  try {
    const redis = initializeRedis();
    await Promise.race([
      redis.ping(),
      new Promise((_resolve, reject) =>
        setTimeout(() => reject(new Error('Redis connection timed out')), BOOT_TIMEOUT_MS)
      ),
    ]);
    logger.success('Redis connected');
  } catch (error) {
    logger.error(`⚠️ Redis unavailable at startup, continuing without it: ${error.message}`);
  }
}

async function checkRedisHealth() {
  const health = { connected: false, latency: null, errors: [] };

  try {
    if (config.redis.clusterUrls.length > 0) {
      const start = Date.now();
      await getRedisClient().ping();
      health.connected = true;
      health.latency = Date.now() - start;
    }
  } catch (error) {
    health.errors.push(`Redis: ${error.message}`);
  }

  return health;
}

async function disconnectRedis() {
  try {
    if (redisClient) {
      redisClient.disconnect();
      logger.info('✅ Redis disconnected');
    }
  } catch (error) {
    logger.error('❌ Error disconnecting from Redis:', error);
  }
}

export { getRedisClient, connectRedis, disconnectRedis, checkRedisHealth };
