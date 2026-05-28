import dayjs from "dayjs";
import z from "zod";
import duration from "dayjs/plugin/duration";
import { CookieOptions } from "hono/utils/cookie";
dayjs.extend(duration);

const envSchema = z.object({
  PORT: z.coerce.number<string>().default(3000),
  DATABASE_URL: z.string().nonempty(),
  REDIS_URL: z.string().nonempty(),
  JWT_ACCESS_SECRET: z.string().nonempty(),
  JWT_REFRESH_SECRET: z.string().nonempty(),
  ALLOWED_ORIGINS: z
    .string()
    .default("http://localhost:3000,http://localhost:5173"),
  RATE_LIMIT_MAX: z.coerce.number<string>().default(100),
  UPLOAD_DIR: z.string().default("uploads"),
  MAX_FILE_SIZE_IN_MB: z.coerce.number<string>().default(5),
  NODE_ENV: z
    .enum(["production", "development", "test"])
    .default("development"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:");
  const errors = z.treeifyError(parsed.error).properties;
  console.error(errors);
  process.exit(1);
}

const env = parsed.data;

export const config = {
  port: env.PORT,
  db: {
    url: env.DATABASE_URL,
  },
  redis: {
    url: env.REDIS_URL,
    refrehsExpiry: dayjs.duration(7, "day").asSeconds(),
    productNotificationExpiry: dayjs.duration(1, "hour").asSeconds(),
  },
  jwt: {
    accessSecret: env.JWT_ACCESS_SECRET,
    refreshSecret: env.JWT_REFRESH_SECRET,
    accessExpiry: 15, // minutes
    refreshExpiry: 7, // days
  },
  cookie: {
    refreshToken: {
      name: "refresh_token",
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "Strict",
      path: "/",
      maxAge: dayjs.duration(7, "day").asSeconds(),
    } satisfies CookieOptions & { name: string },
  },
  rateLimit: {
    global: {
      windowSeconds: 60,
      max: env.RATE_LIMIT_MAX,
      keyPrefix: "rate_limit_global",
    },
    auth: {
      windowSeconds: 60,
      max: 10,
      keyPrefix: "rate_limit_auth",
    },
  },
  upload: {
    dir: env.UPLOAD_DIR,
    maxFileSizeInMb: env.MAX_FILE_SIZE_IN_MB,
    allowedTypes: ["image/jpeg", "image/png", "image/webp"] as const,
  },
  allowedOrigins: env.ALLOWED_ORIGINS?.split(","),
  timeout: {
    default: dayjs.duration(30, "seconds").asMilliseconds(),
    upload: dayjs.duration(2, "minutes").asMilliseconds(),
  },
  nodeEnv: env.NODE_ENV,
} as const;
