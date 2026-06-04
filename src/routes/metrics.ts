import { createMetricsController } from "@/controllers/metrics.ctrl";
import { db } from "@/lib/db";
import { MetricsRepository } from "@/repositories/metrics.repo";
import { MetricsService } from "@/services/metrics.svc";
import { Hono } from "hono";

const repo = new MetricsRepository(db);
const svc = new MetricsService(repo);
const ctrl = createMetricsController(svc);

export const metricsRoute = new Hono();
metricsRoute.get("/stream", ...ctrl.stream);
