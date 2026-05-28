import { AppError } from "@/lib/error";
import { logger } from "@/lib/logger";
import { Context } from "hono";

export const errorMiddleware = (err: Error, c: Context) => {
  if (err instanceof AppError)
    return c.json({ success: false, message: err.message }, err.status);

  logger.error(
    {
      err,
      requestId: c.get("requestId"),
      method: c.req.method,
      path: c.req.path,
    },
    "Unexpected Error",
  );

  return c.json({ success: false, message: err.message }, 500);
};
