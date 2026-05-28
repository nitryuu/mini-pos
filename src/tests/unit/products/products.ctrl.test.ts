import { createProductsController } from "@/controllers/products.ctrl";
import { AppError } from "@/lib/error";
import { errorMiddleware } from "@/middleware/error";
import { notFoundMiddleware } from "@/middleware/not-found";
import { ERROR, IProductsService } from "@/services/products.svc";
import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { data } from "./data";
import { toResponse } from "@/repositories/products.repo";

const svc: IProductsService = {
  list: vi.fn(),
  create: vi.fn(),
  getById: vi.fn(),
  updateById: vi.fn(),
  deleteById: vi.fn(),
};

const ctrl = createProductsController(svc);

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

describe("ProductsController", () => {
  describe("GET /", () => {
    it("returns 200 with buyers data and nextCursor", async () => {
      vi.mocked(svc.list).mockResolvedValue({
        data: data.map(toResponse),
        nextCursor: "2",
      });

      const res = await app.request("/");
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.data).toHaveLength(2);
      expect(body.nextCursor).toBe("2");
    });
  });

  describe("POST /", () => {
    it("returns 201 on successful create", async () => {
      vi.mocked(svc.create).mockResolvedValue(toResponse(data[0]));

      const res = await app.request("/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          barcode: data[0].barcode,
          name: data[0].name,
          qty: data[0].qty,
          price: data[0].price,
          image: data[0].image,
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
    it("returns 200 with buyer data", async () => {
      vi.mocked(svc.getById).mockResolvedValue(toResponse(data[0]));

      const res = await app.request("/1");
      expect(res.status).toBe(200);
    });

    it("returns 404 if no buyers exist", async () => {
      vi.mocked(svc.getById).mockRejectedValue(ERROR.NOT_FOUND);

      const res = await app.request("/1");
      expect(res.status).toBe(404);
    });
  });

  describe("PUT /:id", () => {
    it("returns 200 on successful update", async () => {
      vi.mocked(svc.updateById).mockResolvedValue(toResponse(data[0]));

      const res = await app.request("/1", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          barcode: data[1].barcode,
          name: data[1].name,
          qty: data[1].qty,
          price: data[1].price,
          image: data[1].image,
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
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(400);
    });
  });

  describe("DELETE /:id", () => {
    it("returns 200 on successful delete", async () => {
      vi.mocked(svc.deleteById).mockResolvedValue(toResponse(data[0]));

      const res = await app.request("/1", {
        method: "DELETE",
      });

      expect(res.status).toBe(200);
    });

    it("returns 404 if no buyers exist", async () => {
      vi.mocked(svc.deleteById).mockRejectedValue(ERROR.NOT_FOUND);

      const res = await app.request("/1", {
        method: "DELETE",
      });

      expect(res.status).toBe(404);
    });
  });
});
