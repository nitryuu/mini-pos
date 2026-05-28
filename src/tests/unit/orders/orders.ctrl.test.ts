import { createOrdersController } from "@/controllers/orders.ctrl";
import { errorMiddleware } from "@/middleware/error";
import { notFoundMiddleware } from "@/middleware/not-found";
import { IOrdersService } from "@/services/orders.svc";
import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createData, data, dataItem } from "./data";
import {
  toListOrderResponse,
  toOrderDetailResponse,
} from "@/repositories/orders.repo";
import { AppError } from "@/lib/error";

const svc: IOrdersService = {
  list: vi.fn(),
  getById: vi.fn(),
  create: vi.fn(),
  updateById: vi.fn(),
  deleteById: vi.fn(),
};

const ctrl = createOrdersController(svc);

function createApp() {
  const app = new Hono();
  app.get("/", ...ctrl.list);
  app.post("/", ...ctrl.create);
  app.get("/:id", ...ctrl.getById);
  app.put("/:id", ...ctrl.updateById);
  app.delete("/:id", ...ctrl.deleteById);

  app.onError(errorMiddleware);
  app.notFound(notFoundMiddleware);

  return app;
}

const app = createApp();

beforeEach(() => {
  vi.resetAllMocks();
});

describe("OrdersController", () => {
  describe("GET /", () => {
    it("returns 200 with orders data and nextCursor", async () => {
      vi.mocked(svc.list).mockResolvedValue({
        data: data.map(toListOrderResponse),
        nextCursor: null,
      });

      const res = await app.request("/");
      expect(res.status).toBe(200);
    });
  });

  describe("POST /", () => {
    it("returns 201 on successful create", async () => {
      vi.mocked(svc.create).mockResolvedValue(
        toOrderDetailResponse({ ...data[0], items: dataItem }),
      );

      const res = await app.request("/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...createData[0],
          date: null,
          paid: parseFloat(createData[0].paid),
          items: createData[0].items.map((item) => ({
            ...item,
            price: parseFloat(item.price),
          })),
        }),
      });

      expect(res.status).toBe(201);
    });

    it("returns 400 if body is invalid", async () => {
      vi.mocked(svc.create).mockRejectedValue(
        new AppError("Name is invalid", 400),
      );

      const res = await app.request("/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(400);
    });
  });

  describe("GET /:id", () => {
    it("returns 200 if order exists", async () => {
      vi.mocked(svc.getById).mockResolvedValue({
        ...data[0],
        total: parseFloat(data[0].total),
        items: dataItem.map((item) => ({
          ...item,
          price: parseFloat(item.price),
          total: parseFloat(item.total),
        })),
      });
      const res = await app.request("/1");
      expect(res.status).toBe(200);
    });

    it("returns 404 if no orders exist", async () => {
      vi.mocked(svc.getById).mockRejectedValue(
        new AppError("Buyer not found", 404),
      );

      const res = await app.request("/1");
      expect(res.status).toBe(404);
    });
  });

  describe("PUT /:id", () => {
    it("returns 200 on successful update", async () => {
      vi.mocked(svc.updateById).mockResolvedValue({
        ...data[0],
        total: parseFloat(data[0].total),
        items: dataItem.map((item) => ({
          ...item,
          price: parseFloat(item.price),
          total: parseFloat(item.total),
        })),
      });

      const res = await app.request("/1", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...createData[1],
          date: null,
          paid: parseFloat(createData[1].paid),
          items: createData[1].items.map((item) => ({
            ...item,
            price: parseFloat(item.price),
          })),
        }),
      });

      expect(res.status).toBe(200);
    });

    it("returns 400 if body is invalid", async () => {
      vi.mocked(svc.updateById).mockRejectedValue(
        new AppError("Name is invalid", 400),
      );

      const res = await app.request("/1", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...createData[0],
          paid: parseFloat(createData[0].paid),
          items: createData[0].items.map((item) => ({
            ...item,
            price: parseFloat(item.price),
          })),
        }),
      });

      expect(res.status).toBe(400);
    });

    it("returns 404 if no orders exist", async () => {
      vi.mocked(svc.updateById).mockRejectedValue(
        new AppError("Buyer not found", 404),
      );

      const res = await app.request("/1", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...createData[0],
          date: null,
          paid: parseFloat(createData[0].paid),
          items: createData[0].items.map((item) => ({
            ...item,
            price: parseFloat(item.price),
          })),
        }),
      });

      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /:id", () => {
    it("returns 200 on successful delete", async () => {
      vi.mocked(svc.deleteById).mockResolvedValue({
        ...data[0],
        total: parseFloat(data[0].total),
      });

      const res = await app.request("/1", { method: "DELETE" });
      expect(res.status).toBe(200);
    });

    it("returns 404 if no buyers exist", async () => {
      vi.mocked(svc.deleteById).mockRejectedValue(
        new AppError("Order not found", 404),
      );

      const res = await app.request("/1", { method: "DELETE" });
      expect(res.status).toBe(404);
    });
  });
});
