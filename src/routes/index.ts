import { Hono } from "hono";
import { buyersRoutes } from "./buyers";
import { authMiddleware } from "@/middleware/auth";
import { authRoutes } from "./auth";
import { usersRoutes } from "./users";
import { healthRoutes } from "./health";
import { productsRoutes } from "./products";
import { ordersRoutes } from "./orders";
import { rateLimitMiddleware } from "@/middleware/rate-limit";
import { config } from "@/config";
import { uploadRoutes } from "./upload";
import { rbacMiddleware } from "@/middleware/rbac";
import { wsRoute } from "./ws";
import { exportRoutes } from "./export";

const globalLimit = rateLimitMiddleware(config.rateLimit.global);
const authLimit = rateLimitMiddleware(config.rateLimit.auth);

export default function registerRoutes(app: Hono) {
  app.route("/health", healthRoutes);
  app.route("/ws", wsRoute);

  const api = new Hono();

  api.use("/auth/*", authLimit);
  api.route("/auth", authRoutes);

  api.use(globalLimit);
  api.use(authMiddleware);

  api.route("/upload", uploadRoutes);
  api.route("/buyers", buyersRoutes);
  api.route("/products", productsRoutes);
  api.route("/orders", ordersRoutes);

  api.use(rbacMiddleware("admin"));
  api.route("/users", usersRoutes);
  api.route("/exports", exportRoutes);

  app.route("/api", api);
}
