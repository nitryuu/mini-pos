import Redis from "ioredis";
import { logger } from "./logger";

export const getCached = async <T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>,
  redis: Redis,
) => {
  const cached = await redis.get(key);
  if (cached !== null) {
    logger.info(`CACHE HIT - ${key}`);

    // FOR NOT FOUND DATA
    if (!cached) return cached as T;

    return JSON.parse(cached) as T;
  }

  logger.info(`CACHE MISS - ${key}`);

  const data = await fetcher();
  await redis.set(key, JSON.stringify(data), "EX", ttlSeconds);
  return data;
};

export const invalidateCache = async (key: string, redis: Redis) => {
  await redis.del(key);
};

export const invalidateCachePattern = async (pattern: string, redis: Redis) => {
  const keys = await redis.keys(pattern);
  if (keys.length > 0) await redis.del(...keys);
};
