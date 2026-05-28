import { AppError } from "@/lib/error";
import { Context, Next } from "hono";

type Role = "admin" | "cashier";

const ERROR = {
  FORBIDDEN: new AppError("Forbidden", 403),
};

export function rbacMiddleware(...roles: Role[]) {
  return async (c: Context, next: Next) => {
    const user = c.get("user");
    if (!roles.includes(user.role)) throw ERROR.FORBIDDEN;
    await next();
  };
}
