import { WebSocketHandler } from "@/ws/handlers";
import { Hono } from "hono";
import { upgradeWebSocket } from "hono/bun";

export const wsRoute = new Hono();

wsRoute.get(
  "/",
  upgradeWebSocket((c) => {
    const handler = new WebSocketHandler();
    return {
      async onOpen(_, ws) {
        await handler.onOpen(ws, c);
      },
      onMessage(message, ws) {
        handler.onMessage(message, ws);
      },
      onClose() {
        handler.onClose();
      },
      onError(_, ws) {
        handler.onError(ws);
      },
    };
  }),
);
