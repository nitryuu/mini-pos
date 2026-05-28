import { config } from "@/config";
import z from "zod";

export const uploadImageQuerySchema = z.object({
  folder: z.enum(["products"]).optional(),
});

export const imageSchema = z
  .file()
  .mime(["image/jpeg", "image/png", "image/webp"])
  .max(config.upload.maxFileSizeInMb * 1024 * 1024);

export const uploadImageSchema = z.object({
  file: imageSchema.check((ctx) => {
    if (ctx.value.size === 0) {
      ctx.issues.push({
        code: "custom",
        message: "File is empty",
        input: ctx.value,
      });
    }
  }),
});

export type UploadImageInput = z.infer<typeof uploadImageSchema>;
