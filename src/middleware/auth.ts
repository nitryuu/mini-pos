import { config } from "@/config";
import { AppError } from "@/lib/error";
import { logger } from "@/lib/logger";
import { redis } from "@/lib/redis";
import { AccessTokenPayload } from "@/types";
import { Context, Next } from "hono";
import { verify } from "hono/jwt";

const ERROR = {
  UNAUTHORIZED: new AppError("Unauthorized", 401),
  INVALID_TOKEN: new AppError("Invalid token", 401),
} as const;

export const authMiddleware = async (c: Context, next: Next) => {
  const token = c.req.header("Authorization")?.replace("Bearer ", "");
  if (!token) throw ERROR.UNAUTHORIZED;

  let payload: AccessTokenPayload;

  try {
    payload = (await verify(
      token,
      config.jwt.accessSecret,
      "HS256",
    )) as AccessTokenPayload;
  } catch {
    throw ERROR.INVALID_TOKEN;
  }

  try {
    const blacklisted = await redis.get(`blacklist:${token}`);
    if (blacklisted) throw ERROR.UNAUTHORIZED;
  } catch (err) {
    if (!(err instanceof AppError)) {
      logger.warn("Redis unavailable, skipping blacklist check");
    } else {
      throw err;
    }
  }

  c.set("user", payload);
  await next();
};
