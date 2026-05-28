import { db } from "@/lib/db";
import { redis } from "@/lib/redis";
import { sql } from "drizzle-orm";
import { Hono } from "hono";

export const healthRoutes = new Hono();

healthRoutes.get("/", async (c) => {
  return c.json({ success: true, status: "ok" });
});

healthRoutes.get("/ready", async (c) => {
  const checks = {
    db: "ok",
    redis: "ok",
  };

  try {
    await db.execute(sql`SELECT 1`);
  } catch {
    checks.db = "error";
  }

  try {
    await redis.ping();
  } catch {
    checks.redis = "error";
  }

  const healthy = Object.values(checks).every((v) => v === "ok");

  return c.json(
    { success: true, status: healthy ? "ok" : "degraded", checks },
    healthy ? 200 : 503,
  );
});
