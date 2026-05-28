import { config } from "@/config";
import { AccessTokenPayload } from "@/types";
import { Context } from "hono";
import { verify } from "hono/jwt";
import { wsManager } from "./manager";
import { WSContext, WSMessageReceive } from "hono/ws";

export class WebSocketHandler {
  private connectionId: string | null = null;

  async onOpen(ws: WSContext<any>, c: Context) {
    const token = c.req.query("token");
    if (!token) {
      ws.close(1008, "Unauthorized");
      return;
    }

    try {
      const payload = (await verify(
        token,
        config.jwt.accessSecret,
        "HS256",
      )) as AccessTokenPayload;

      this.connectionId = crypto.randomUUID();
      wsManager.add(this.connectionId, {
        ws: ws.raw,
        userId: payload.sub,
        role: payload.role,
      });

      ws.send(
        JSON.stringify({
          event: "connected",
          data: { connectionId: this.connectionId },
        }),
      );
    } catch {
      ws.close(1008, "Invalid token");
    }
  }

  onMessage(message: MessageEvent<WSMessageReceive>, ws: WSContext<any>) {
    try {
      const { event } = JSON.parse(message.data as string);
      if (event === "ping") ws.send(JSON.stringify({ event: "pong" }));
    } catch {
      // NOTE: IGNORE
    }
  }

  onClose() {
    if (this.connectionId) wsManager.remove(this.connectionId);
  }

  onError(ws: WSContext<any>) {
    if (this.connectionId) wsManager.remove(this.connectionId);
    ws.close();
  }
}
