import { config } from "@/config";
import { WebSocketHandler } from "@/ws/handlers";
import { wsManager } from "@/ws/manager";
import dayjs from "dayjs";
import { sign } from "hono/jwt";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/ws/manager", () => ({
  wsManager: {
    add: vi.fn(),
    remove: vi.fn(),
    sendToUser: vi.fn(),
    sendToCashiers: vi.fn(),
    sendToAdmins: vi.fn(),
    broadcast: vi.fn(),
  },
}));

const mockWs = {
  send: vi.fn(),
  close: vi.fn(),
  raw: {},
} as any;

const mockContext = (token?: string) =>
  ({ req: { query: () => token } }) as any;

describe("WebSocketHandler", () => {
  let handler: WebSocketHandler;

  beforeEach(() => {
    handler = new WebSocketHandler();
    vi.clearAllMocks();
  });

  describe("onOpen", () => {
    it("closes connection if no token provided", async () => {
      await handler.onOpen(mockWs, mockContext(undefined));

      expect(mockWs.close).toHaveBeenCalledWith(1008, "Unauthorized");
      expect(wsManager.add).not.toHaveBeenCalled();
    });

    it("closes connection if token is invalid", async () => {
      await handler.onOpen(mockWs, mockContext("invalid-token"));

      expect(mockWs.close).toHaveBeenCalledWith(1008, "Invalid token");
      expect(wsManager.add).not.toHaveBeenCalled();
    });

    it("adds connection to manager if token is valid", async () => {
      const validToken = await sign(
        {
          sub: 1,
          email: "john@test.com",
          role: "cashier",
          exp: dayjs().add(15, "minute").unix(),
        },
        config.jwt.accessSecret,
        "HS256",
      );

      await handler.onOpen(mockWs, mockContext(validToken));

      expect(wsManager.add).toHaveBeenCalledOnce();
      expect(mockWs.close).not.toHaveBeenCalled();
      expect(mockWs.send).toHaveBeenCalledWith(
        expect.stringContaining("connected"),
      );
    });
  });

  describe("onMessage", () => {
    it("responds with pong on ping", () => {
      handler.onMessage(
        { data: JSON.stringify({ event: "ping" }) } as any,
        mockWs,
      );

      expect(mockWs.send).toHaveBeenCalledWith(
        JSON.stringify({ event: "pong" }),
      );
    });

    it("ignores malformed messages", () => {
      handler.onMessage({ data: "not json" } as any, mockWs);
      expect(mockWs.send).not.toHaveBeenCalled();
    });
  });

  describe("onClose", () => {
    it("removes connection from manager", async () => {
      const validToken = await sign(
        {
          sub: 1,
          email: "john@test.com",
          role: "cashier",
          exp: dayjs().add(15, "minute").unix(),
        },
        config.jwt.accessSecret,
        "HS256",
      );

      await handler.onOpen(mockWs, mockContext(validToken));
      handler.onClose();

      expect(wsManager.remove).toHaveBeenCalledOnce();
    });

    it("does nothing if connection was never opened", () => {
      handler.onClose();
      expect(wsManager.remove).not.toHaveBeenCalled();
    });
  });

  describe("onError", () => {
    it("removes connection and closes ws", async () => {
      const validToken = await sign(
        {
          sub: 1,
          email: "john@test.com",
          role: "cashier",
          exp: dayjs().add(15, "minute").unix(),
        },
        config.jwt.accessSecret,
        "HS256",
      );

      await handler.onOpen(mockWs, mockContext(validToken));
      handler.onError(mockWs);

      expect(wsManager.remove).toHaveBeenCalledOnce();
      expect(mockWs.close).toHaveBeenCalledOnce();
    });
  });
});
