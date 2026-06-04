import { Worker } from "bullmq";
import { exportProcessor } from "../processors/export.processor";
import { redis } from "@/lib/redis";
import { logger } from "@/lib/logger";
import { WS_EVENTS, wsManager } from "@/ws/manager";

export const createExportWorker = () => {
  const worker = new Worker("export", exportProcessor, {
    connection: redis.options,
    concurrency: 2,
  });

  worker.on("completed", (job) => {
    logger.info({ jobId: job.id }, "Export job completed");

    wsManager.sendToUser(job.data.userId, WS_EVENTS.EXPORT_COMPLETED, {
      jobId: job.id,
      url: job.returnvalue.url,
      filename: job.returnvalue.filename,
    });
  });

  worker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, err }, "Export job failed");

    if (job) {
      wsManager.sendToUser(job.data.userId, WS_EVENTS.EXPORT_FAILED, {
        jobId: job.id,
        reason: err.message,
      });
    }
  });

  worker.on("progress", (job, progress) => {
    wsManager.sendToUser(job.data.userId, WS_EVENTS.EXPORT_PROGRESS, {
      jobId: job.id,
      progress,
    });
  });

  return worker;
};
