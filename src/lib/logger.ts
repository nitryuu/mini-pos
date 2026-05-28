import { config } from "@/config";
import pino from "pino";

export const logger = pino({
  level: config.nodeEnv === "production" ? "info" : "debug",
  transport:
    config.nodeEnv === "production" ? undefined : { target: "pino-pretty" },
});
