import { createUploadController } from "@/controllers/upload.ctrl";
import { Hono } from "hono";

const ctrl = createUploadController();

export const uploadRoutes = new Hono();
uploadRoutes.post("/image", ...ctrl.uploadImage);
