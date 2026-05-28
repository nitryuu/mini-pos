import { Hono } from "hono";
import { cors } from "hono/cors";
import { requestId } from "hono/request-id";
import { config } from "./config";
import { timeout } from "hono/timeout";
import { logger } from "hono/logger";
import { csrf } from "hono/csrf";
import registerRoutes from "./routes";
import { errorMiddleware } from "./middleware/error";
import { notFoundMiddleware } from "./middleware/not-found";

export const app = new Hono();

app.use("*", requestId());
app.use("*", timeout(config.timeout.default));
app.use("*", logger());
app.use("*", cors({ origin: config.allowedOrigins, credentials: true }));
app.use("*", csrf({ origin: config.allowedOrigins }));

registerRoutes(app);

app.onError(errorMiddleware);
app.notFound(notFoundMiddleware);
