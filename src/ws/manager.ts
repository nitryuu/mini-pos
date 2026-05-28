import { db } from "@/lib/db";
import {
  notifications,
  notificationTypesValues,
} from "@/models/notification.model";
import { ServerWebSocket } from "bun";

type Client = {
  ws: ServerWebSocket;
  userId: number;
  role: "admin" | "cashier";
};

type ValueOf<T> = T[keyof T];

export const WS_EVENTS = {
  ORDER_CREATED: "order:created",
  ORDER_UPDATED: "order:updated",
  ORDER_DELETED: "order:deleted",

  PRODUCT_CREATED: "product:created",
  PRODUCT_UPDATED: "product:updated",
  PRODUCT_DELETED: "product:deleted",
  PRODUCT_LOW_STOCK: "product:low_stock",
  PRODUCT_OUT_OF_STOCK: "product:out_of_stock",

  SYSTEM_ANNOUNCEMENT: "system:announcement",

  CONNECTED: "connected",
  PONG: "pong",
} as const;

class WebSocketManager {
  private clients = new Map<string, Client>();

  add(connectionId: string, client: Client) {
    this.clients.set(connectionId, client);
  }

  remove(connectionId: string) {
    this.clients.delete(connectionId);
  }

  async sendToUser(
    userId: number,
    event: ValueOf<typeof WS_EVENTS>,
    data: unknown,
  ) {
    const clientsMap = this.clients.values();
    const clients = [...clientsMap];
    let role = null;
    for (let i = 0; i < clients.length; i++) {
      const client = clients[i];
      if (client.userId === userId) {
        role = client.role;
        client.ws.send(JSON.stringify({ event, data }));
      }
    }

    if (
      notificationTypesValues.includes(
        event as ValueOf<Omit<typeof WS_EVENTS, "CONNECTED" | "PONG">>,
      )
    ) {
      await db.insert(notifications).values({
        type: event as ValueOf<Omit<typeof WS_EVENTS, "CONNECTED" | "PONG">>,
        data,
        role,
        userId,
      });
    }
  }

  async sendToCashiers(event: ValueOf<typeof WS_EVENTS>, data: unknown) {
    const clientsMap = this.clients.values();
    const clients = [...clientsMap];
    for (let i = 0; i < clients.length; i++) {
      const client = clients[i];
      if (client.role === "cashier") {
        client.ws.send(JSON.stringify({ event, data }));
      }
    }

    if (
      notificationTypesValues.includes(
        event as ValueOf<Omit<typeof WS_EVENTS, "CONNECTED" | "PONG">>,
      )
    ) {
      await db.insert(notifications).values({
        type: event as ValueOf<Omit<typeof WS_EVENTS, "CONNECTED" | "PONG">>,
        data,
        role: "cashier",
      });
    }
  }

  async sendToAdmins(event: ValueOf<typeof WS_EVENTS>, data: unknown) {
    const clientsMap = this.clients.values();
    const clients = [...clientsMap];
    for (let i = 0; i < clients.length; i++) {
      const client = clients[i];
      if (client.role === "admin") {
        client.ws.send(JSON.stringify({ event, data }));
      }
    }

    if (
      notificationTypesValues.includes(
        event as ValueOf<Omit<typeof WS_EVENTS, "CONNECTED" | "PONG">>,
      )
    ) {
      await db.insert(notifications).values({
        type: event as ValueOf<Omit<typeof WS_EVENTS, "CONNECTED" | "PONG">>,
        data,
        role: "admin",
      });
    }
  }

  async broadcast(event: ValueOf<typeof WS_EVENTS>, data: unknown) {
    const clientsMap = this.clients.values();
    const clients = [...clientsMap];
    for (let i = 0; i < clients.length; i++) {
      clients[i].ws.send(JSON.stringify({ event, data }));
    }

    if (
      notificationTypesValues.includes(
        event as ValueOf<Omit<typeof WS_EVENTS, "CONNECTED" | "PONG">>,
      )
    ) {
      await db.insert(notifications).values({
        type: event as ValueOf<Omit<typeof WS_EVENTS, "CONNECTED" | "PONG">>,
        data,
      });
    }
  }

  getConnectedCount() {
    return this.clients.size;
  }
}

export const wsManager = new WebSocketManager();
