import { RedisContainer, StartedRedisContainer } from "@testcontainers/redis";
import { Redis } from "ioredis";
import { afterAll, beforeAll, beforeEach } from "vitest";

let redis: Redis;

export const getRedis = () => redis;

export const useRedis = () => {
  let container: StartedRedisContainer;

  beforeAll(async () => {
    container = await new RedisContainer("redis:8").start();

    redis = new Redis(container.getConnectionUrl());
  });

  beforeEach(async () => {
    await redis.flushdb();
  });

  afterAll(async () => {
    await redis.quit();
    await container.stop();
  });
};
