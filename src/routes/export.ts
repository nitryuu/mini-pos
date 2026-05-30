import { createExportController } from "@/controllers/export.ctrl";
import { ExportService } from "@/services/export.svc";
import { Hono } from "hono";

const service = new ExportService();
const ctrl = createExportController(service);

export const exportRoutes = new Hono();

exportRoutes.post("/", ...ctrl.create);
exportRoutes.get("/:jobId", ...ctrl.getStatus);
