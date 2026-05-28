import { AppError } from "./error";

export const encodeCursor = <T extends Record<string, unknown>>(cursor: T) => {
  const str = JSON.stringify(cursor);
  return Buffer.from(str).toString("base64url");
};

export const decodeCursor = <T extends Record<string, unknown>>(
  cursor: string,
): T => {
  try {
    const str = Buffer.from(cursor, "base64url").toString("utf-8");
    const parsed = JSON.parse(str);

    if (!parsed || typeof parsed !== "object") {
      throw new AppError("Invalid cursor shape", 400);
    }

    return parsed as T;
  } catch {
    throw new AppError("Invalid cursor", 400);
  }
};
