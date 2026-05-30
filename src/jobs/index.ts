import { createExportWorker } from "./workers/export.worker";
import { logger } from "@/lib/logger";

export function registerJobs() {
  const exportWorker = createExportWorker();

  logger.info("Workers started");

  return async () => {
    await exportWorker.close();
  };
}
