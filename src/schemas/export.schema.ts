import z from "zod";

export const createExportSchema = z.object({
  startDate: z.iso.datetime(),
  endDate: z.iso.datetime(),
});

export type CreateExportInput = z.infer<typeof createExportSchema>;

export const exportParamSchema = z.object({
  jobId: z.string(),
});
