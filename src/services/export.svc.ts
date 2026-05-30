import { exportQueue } from "@/jobs/queues";
import { AppError } from "@/lib/error";
import { CreateExportInput } from "@/schemas/export.schema";

const ERROR = {
  NOT_FOUND: new AppError("Export job not found", 404),
};

export class ExportService {
  async create(input: CreateExportInput, userId: number) {
    const job = await exportQueue.add(
      "export-orders",
      {
        startDate: input.startDate,
        endDate: input.endDate,
        userId,
      },
      {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 1000,
        },
        removeOnComplete: 50,
        removeOnFail: 20,
      },
    );

    return { jobId: job.id };
  }

  async getStatus(jobId: string) {
    const job = await exportQueue.getJob(jobId);
    if (!job) throw ERROR.NOT_FOUND;

    const state = await job.getState();
    const progress = job.progress;

    return {
      jobId,
      state,
      progress,
      result: state === "completed" ? job.returnvalue : null,
      reason: state === "failed" ? job.failedReason : null,
    };
  }
}
