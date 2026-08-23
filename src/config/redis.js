import Redis from 'ioredis';
import config from './index.js';
import { logger } from '../shared/index.js';

let redisClient;

function initializeRedis() {
  if (!redisClient && config.redis.clusterUrls.length > 0) {
    if (config.redis.clusterUrls.length === 1) {
      redisClient = new Redis(config.redis.clusterUrls[0], {
        password: config.redis.password,
      });
    } else {
      redisClient = new Redis.Cluster(
        config.redis.clusterUrls.map((url) => {
          const urlObj = new URL(url);
          return {
            host: urlObj.hostname,
            port: urlObj.port || 6379,
          };
        }),
        {
          redisOptions: {
            password: config.redis.password,
          },
        }
      );
    }
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
  if (config.redis.clusterUrls.length > 0) {
    const redis = initializeRedis();
    await redis.ping();
    logger.success('Redis connected');
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
