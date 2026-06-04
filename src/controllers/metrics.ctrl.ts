import { config } from "@/config";
import { AppError } from "@/lib/error";
import { metricsBroadcaster } from "@/lib/metrics-broadcaster";
import { metricsSchema } from "@/schemas/metric.schema";
import { IMetricsService } from "@/services/metrics.svc";
import { AccessTokenPayload } from "@/types";
import { zValidator } from "@hono/zod-validator";
import { createFactory } from "hono/factory";
import { verify } from "hono/jwt";
import { streamSSE } from "hono/streaming";

const ERROR = {
  INVALID_TOKEN: new AppError("Invalid Token", 401),
  FORBIDDEN: new AppError("Forbidden", 403),
};

const factory = createFactory();

export function createMetricsController(svc: IMetricsService) {
  const stream = factory.createHandlers(
    zValidator("query", metricsSchema),
    async (c) => {
      const { token } = c.req.valid("query");

      try {
        const payload = (await verify(
          token,
          config.jwt.accessSecret,
          "HS256",
        )) as AccessTokenPayload;

        if (payload.role !== "admin") throw ERROR.FORBIDDEN;
      } catch {
        throw ERROR.INVALID_TOKEN;
      }

      return streamSSE(c, async (sse) => {
        const metrics = await svc.getMetrics();
        await sse.writeSSE({
          event: "metrics",
          data: JSON.stringify(metrics),
        });

        const unsubscribe = metricsBroadcaster.subscribe(async (data) => {
          try {
            await sse.writeSSE({ event: "metrics", data });
          } catch {
            unsubscribe();
          }
        });

        c.req.raw.signal.addEventListener("abort", () => {
          unsubscribe();
        });

        while (!c.req.raw.signal.aborted) {
          await new Promise((resolve) => setTimeout(resolve, 30_000));
          if (!c.req.raw.signal.aborted) {
            await sse.writeSSE({ data: "", event: "ping" });
          }
        }
      });
    },
  );

  return { stream };
}
