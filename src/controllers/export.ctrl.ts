import { createExportSchema, exportParamSchema } from "@/schemas/export.schema";
import { ExportService } from "@/services/export.svc";
import { zValidator } from "@hono/zod-validator";
import { createFactory } from "hono/factory";

const factory = createFactory();

export function createExportController(svc: ExportService) {
  const create = factory.createHandlers(
    zValidator("json", createExportSchema),
    async (c) => {
      const body = c.req.valid("json");
      const user = c.get("user");
      const result = await svc.create(body, user.sub);
      return c.json({ success: true, data: { result } }, 201);
    },
  );

  const getStatus = factory.createHandlers(
    zValidator("param", exportParamSchema),
    async (c) => {
      const { jobId } = c.req.valid("param");
      const status = await svc.getStatus(jobId);
      return c.json({ success: true, data: { status } });
    },
  );

  return { create, getStatus };
}
