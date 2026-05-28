import { Context } from "hono";

export const notFoundMiddleware = (c: Context) => {
  return c.json({ success: false, message: "Route not found" }, 404);
};
