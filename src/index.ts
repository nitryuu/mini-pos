import { app } from "./app";
import { config } from "./config";
import { logger } from "./lib/logger";
import { websocket } from "hono/bun";

const server = Bun.serve({
  port: config.port,
  fetch: app.fetch,
  websocket,
});

logger.info(`Server started on http://localhost:${config.port}`);

let isShuttingDown = false;

const shutdown = async (signal: string) => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info(`${signal} received`);
  logger.info("Shutting down..");

  server.stop();

  logger.info("Shutdown complete");
  process.exit(0);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
