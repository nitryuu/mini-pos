import { Hono } from "hono";
import { getDb, useDb } from "../lib/with-db";
import { getRedis, useRedis } from "../lib/with-redis";
import { OrdersRepository } from "@/repositories/orders.repo";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { OrdersService } from "@/services/orders.svc";
import { createOrdersController } from "@/controllers/orders.ctrl";
import { errorMiddleware } from "@/middleware/error";
import { notFoundMiddleware } from "@/middleware/not-found";
import { createData } from "../unit/orders/data";
import { connectWs, waitForMessage } from "../lib/with-ws";
import { WS_EVENTS } from "@/ws/manager";
import { ProductsRepository } from "@/repositories/products.repo";
import { ProductsService } from "@/services/products.svc";
import { createProductsController } from "@/controllers/products.ctrl";
import { BunWebSocketData, upgradeWebSocket, websocket } from "hono/bun";
import { WebSocketHandler } from "@/ws/handlers";

useDb();
useRedis();

let app: Hono;
let server: Bun.Server<BunWebSocketData>;

beforeAll(async () => {
  const ordersRepo = new OrdersRepository(getDb());
  const ordersSvc = new OrdersService(ordersRepo, getRedis());
  const ordersCtrl = createOrdersController(ordersSvc);

  const productsRepo = new ProductsRepository(getDb());
  const productsSvc = new ProductsService(productsRepo, getRedis());
  const productsCtrl = createProductsController(productsSvc);

  app = new Hono();

  const api = new Hono();

  const ordersRoutes = new Hono();
  ordersRoutes.get("/", ...ordersCtrl.list);
  ordersRoutes.get("/:id", ...ordersCtrl.getById);
  ordersRoutes.post("/", ...ordersCtrl.create);
  ordersRoutes.put("/:id", ...ordersCtrl.updateById);
  ordersRoutes.delete("/:id", ...ordersCtrl.deleteById);

  const productsRoutes = new Hono();
  productsRoutes.post("/", ...productsCtrl.create);

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

  api.route("/orders", ordersRoutes);
  api.route("/products", productsRoutes);
  app.route("/ws", wsRoute);

  app.route("/api", api);

  app.onError(errorMiddleware);
  app.notFound(notFoundMiddleware);

  server = Bun.serve({
    port: 3001,
    fetch: app.fetch,
    websocket: websocket,
  });
});

afterAll(() => {
  server.stop();
});

const createProduct = async (name = "Product A", qty = 20) => {
  const res = await app.request("/api/products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      barcode: null,
      name,
      qty,
      price: 1000.0,
      image: null,
    }),
  });

  return res.json();
};

describe("Orders E2E", () => {
  describe("POST /api/orders", () => {
    it("sends order created event", async () => {
      const adminWs = await connectWs("admin");

      const [productA, productB] = await Promise.all([
        createProduct(),
        createProduct("Product B"),
      ]);

      const notificationPromise = waitForMessage(adminWs);

      await app.request("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...createData[0],
          date: null,
          paid: parseFloat(createData[0].paid),
          items: createData[0].items.map((item, i) => ({
            ...item,
            productId: i === 0 ? productA.data.id : productB.data.id,
            price: parseFloat(item.price),
          })),
        }),
      });

      const notification = await notificationPromise;
      expect(notification.event).toBe(WS_EVENTS.ORDER_CREATED);
      adminWs.close();
    });

    it("sends low stock products event", async () => {
      const adminWs = await connectWs("admin");

      const [productA, productB] = await Promise.all([
        createProduct("Product A", 6),
        createProduct("Product B", 6),
      ]);

      const notificationPromise = waitForMessage(adminWs);

      await app.request("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...createData[0],
          date: null,
          paid: parseFloat(createData[0].paid),
          items: createData[0].items.map((item, i) => ({
            ...item,
            productId: i === 0 ? productA.data.id : productB.data.id,
            price: parseFloat(item.price),
          })),
        }),
      });

      const notification = await notificationPromise;
      expect(notification.event).toBe(WS_EVENTS.PRODUCT_LOW_STOCK);
      adminWs.close();
    });

    it("sends out of stock products event", async () => {
      const adminWs = await connectWs("admin");

      const [productA, productB] = await Promise.all([
        createProduct("Product A", 2),
        createProduct("Product B", 2),
      ]);

      const notificationPromise = waitForMessage(adminWs);

      await app.request("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...createData[0],
          date: null,
          paid: parseFloat(createData[0].paid),
          items: createData[0].items.map((item, i) => ({
            ...item,
            productId: i === 0 ? productA.data.id : productB.data.id,
            price: parseFloat(item.price),
          })),
        }),
      });

      const notification = await notificationPromise;
      expect(notification.event).toBe(WS_EVENTS.PRODUCT_OUT_OF_STOCK);
      adminWs.close();
    });
  });

  describe("PUT /api/orders/:id", () => {
    it("sends order updated event", async () => {
      const adminWs = await connectWs("admin");

      const [productA, productB] = await Promise.all([
        createProduct(),
        createProduct("Product B"),
      ]);

      const res = await app.request("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...createData[0],
          date: null,
          paid: parseFloat(createData[0].paid),
          items: createData[0].items.map((item, i) => ({
            ...item,
            productId: i === 0 ? productA.data.id : productB.data.id,
            price: parseFloat(item.price),
          })),
        }),
      });

      const body = await res.json();

      const notificationPromise = waitForMessage(adminWs);
      await app.request(`/api/orders/${body.data.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...createData[0],
          date: null,
          paid: parseFloat(createData[0].paid),
          items: createData[0].items.map((item, i) => ({
            ...item,
            productId: i === 0 ? productA.data.id : productB.data.id,
            price: parseFloat(item.price),
          })),
        }),
      });

      const notification = await notificationPromise;
      expect(notification.event).toBe(WS_EVENTS.ORDER_UPDATED);
      adminWs.close();
    });

    it("sends low stock products event", async () => {
      const adminWs = await connectWs("admin");

      const [productA, productB] = await Promise.all([
        createProduct(),
        createProduct("Product B"),
      ]);

      const res = await app.request("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...createData[0],
          date: null,
          paid: parseFloat(createData[0].paid),
          items: createData[0].items.map((item, i) => ({
            ...item,
            productId: i === 0 ? productA.data.id : productB.data.id,
            price: parseFloat(item.price),
          })),
        }),
      });

      const body = await res.json();

      const notificationPromise = waitForMessage(adminWs);
      await app.request(`/api/orders/${body.data.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...createData[0],
          date: null,
          paid: parseFloat(createData[0].paid),
          items: createData[0].items.map((item, i) => ({
            ...item,
            productId: i === 0 ? productA.data.id : productB.data.id,
            qty: 15,
            price: parseFloat(item.price),
          })),
        }),
      });

      const notification = await notificationPromise;
      expect(notification.event).toBe(WS_EVENTS.PRODUCT_LOW_STOCK);
      adminWs.close();
    });

    it("sends out of stock products event", async () => {
      const adminWs = await connectWs("admin");

      const [productA, productB] = await Promise.all([
        createProduct(),
        createProduct("Product B"),
      ]);

      const res = await app.request("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...createData[0],
          date: null,
          paid: parseFloat(createData[0].paid),
          items: createData[0].items.map((item, i) => ({
            ...item,
            productId: i === 0 ? productA.data.id : productB.data.id,
            price: parseFloat(item.price),
          })),
        }),
      });

      const body = await res.json();

      const notificationPromise = waitForMessage(adminWs);
      await app.request(`/api/orders/${body.data.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...createData[0],
          date: null,
          paid: parseFloat(createData[0].paid),
          items: createData[0].items.map((item, i) => ({
            ...item,
            productId: i === 0 ? productA.data.id : productB.data.id,
            qty: 20,
            price: parseFloat(item.price),
          })),
        }),
      });

      const notification = await notificationPromise;
      expect(notification.event).toBe(WS_EVENTS.PRODUCT_OUT_OF_STOCK);
      adminWs.close();
    });
  });

  describe("DELETE /api/orders/:id", () => {
    it("sends order deleted event", async () => {
      const adminWs = await connectWs("admin");

      const [productA, productB] = await Promise.all([
        createProduct(),
        createProduct("Product B"),
      ]);

      const res = await app.request("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...createData[0],
          date: null,
          paid: parseFloat(createData[0].paid),
          items: createData[0].items.map((item, i) => ({
            ...item,
            productId: i === 0 ? productA.data.id : productB.data.id,
            price: parseFloat(item.price),
          })),
        }),
      });

      const body = await res.json();

      const notificationPromise = waitForMessage(adminWs);
      await app.request(`/api/orders/${body.data.id}`, { method: "DELETE" });

      const notification = await notificationPromise;
      expect(notification.event).toBe(WS_EVENTS.ORDER_DELETED);
      adminWs.close();
    });
  });
});
