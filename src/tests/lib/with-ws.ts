import { config } from "@/config";
import { AccessTokenPayload } from "@/types";
import dayjs from "dayjs";
import { sign } from "hono/jwt";

const WS_URL = "ws://localhost:3001";

export const getValidToken = async (
  role: "admin" | "cashier" = "cashier",
  userId = 1,
) => {
  return sign(
    {
      sub: userId,
      email: "test@test.com",
      role,
      exp: dayjs().add(15, "minute").unix(),
    } satisfies AccessTokenPayload,
    config.jwt.accessSecret,
    "HS256",
  );
};

export const createWsClient = (token: string): Promise<WebSocket> => {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`${WS_URL}/ws?token=${token}`);
    ws.onmessage = (ev) => {
      const { event: eventName } = JSON.parse(ev.data);
      if (eventName === "connected") {
        ws.onmessage = null;
        resolve(ws);
      }
    };

    ws.onerror = () => reject(new Error("WebSocket connection failed"));
    ws.onclose = (ev) => {
      if (ev.code === 1008) reject(new Error("Unauthorized"));
      reject(new Error("Connection closed unexpectedly"));
    };

    setTimeout(() => reject(new Error("Connection timeout")), 60000);
  });
};

export const waitForMessage = (ws: WebSocket): Promise<any> => {
  return new Promise((resolve) => {
    ws.onmessage = (ev) => {
      resolve(JSON.parse(ev.data));
    };
  });
};

export const connectWs = async (
  role: "admin" | "cashier" = "cashier",
  userId = 1,
) => {
  const token = await getValidToken(role, userId);
  return createWsClient(token);
};
