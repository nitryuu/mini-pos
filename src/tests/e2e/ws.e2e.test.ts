import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { BunWebSocketData, upgradeWebSocket, websocket } from "hono/bun";
import { connectWs, createWsClient, waitForMessage } from "../lib/with-ws";
import { Hono } from "hono";
import { WebSocketHandler } from "@/ws/handlers";

let app: Hono;
let server: Bun.Server<BunWebSocketData>;

beforeAll(() => {
  app = new Hono();

  const wsRoute = new Hono();
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

  app.route("/ws", wsRoute);

  server = Bun.serve({
    port: 3001,
    fetch: app.fetch,
    websocket: websocket,
  });
});

afterAll(() => {
  server.stop();
});

describe("WebSocket E2E", () => {
  it("connects successfully with valid token", async () => {
    const ws = await connectWs();
    expect(ws.readyState).toBe(WebSocket.OPEN);
    ws.close();
  });

  it("rejects connection with no token", async () => {
    const token = createWsClient("");
    await expect(token).rejects.toThrow("Unauthorized");
  });

  it("responds to ping with pong", async () => {
    const ws = await connectWs();
    ws.send(JSON.stringify({ event: "ping" }));
    const response = await waitForMessage(ws);

    expect(response.event).toBe("pong");
    ws.close();
  });
});
