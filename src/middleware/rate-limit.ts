import { AppError } from "@/lib/error";
import { redis } from "@/lib/redis";
import { Context, Next } from "hono";

type RateLimitOptions = {
  windowSeconds: number;
  max: number;
  keyPrefix?: string;
};

const ERROR = {
  TOO_MANY_REQUESTS: new AppError(
    "Too many requests, please try again later",
    429,
  ),
} as const;

export function rateLimitMiddleware({
  windowSeconds,
  max,
  keyPrefix,
}: RateLimitOptions) {
  return async (c: Context, next: Next) => {
    const user = c.get("user");
    const identifier = user
      ? `user:${user.sub}`
      : `ip:${c.req.header("cf-connecting-ip") ?? c.req.header("x-forwarded-for")?.split(",")[0].trim() ?? c.req.header("x-real-ip") ?? "unknown"}`;

    const key = `${keyPrefix}:${identifier}`;
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, windowSeconds);
    if (count > max) throw ERROR.TOO_MANY_REQUESTS;

    const ttl = await redis.ttl(key);
    c.header("X-RateLimit-Limit", String(max));
    c.header("X-RateLimit-Remaining", String(Math.max(0, max - count)));
    c.header("X-RateLimit-Reset", String(ttl));

    await next();
  };
}
