import { config } from "@/config";
import { existsSync } from "node:fs";
import { unlink } from "node:fs/promises";
import { writeFile } from "node:fs/promises";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

export const generateFileName = (originalName: string) => {
  const ext = originalName.split(".").pop();
  return `${crypto.randomUUID()}.${ext}`;
};

export const saveFile = async (file: File, folder: string) => {
  const dir = join(config.upload.dir, folder);
  if (!existsSync(dir)) await mkdir(dir, { recursive: true });

  const fileName = generateFileName(file.name);
  const filePath = join(dir, fileName);

  await writeFile(filePath, Buffer.from(await file.arrayBuffer()));
  return `/uploads/${folder}/${fileName}`;
};

export const deleteFile = async (urlPath: string) => {
  try {
    const filePath = join(config.upload.dir, urlPath.replace("/uploads", ""));
    await unlink(filePath);
  } catch {
    // NOTE: IGNORE
  }
};
