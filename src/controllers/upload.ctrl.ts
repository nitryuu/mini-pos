import { saveFile } from "@/lib/upload";
import {
  uploadImageQuerySchema,
  uploadImageSchema,
} from "@/schemas/upload.schema";
import { zValidator } from "@hono/zod-validator";
import { createFactory } from "hono/factory";

const factory = createFactory();

export function createUploadController() {
  const uploadImage = factory.createHandlers(
    zValidator("query", uploadImageQuerySchema),
    zValidator("form", uploadImageSchema),
    async (c) => {
      const { file } = c.req.valid("form");
      const query = c.req.valid("query");

      let folder = "misc";
      if (query.folder) folder = query.folder;

      const data = await saveFile(file, folder);
      return c.json({ success: true, data });
    },
  );

  return { uploadImage };
}
