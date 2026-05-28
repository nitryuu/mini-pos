import { createBuyersController } from "@/controllers/buyers.ctrl";
import { AppError } from "@/lib/error";
import { errorMiddleware } from "@/middleware/error";
import { notFoundMiddleware } from "@/middleware/not-found";
import { IBuyersService } from "@/services/buyers.svc";
import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { data } from "./data";

const svc: IBuyersService = {
  list: vi.fn(),
  create: vi.fn(),
  getById: vi.fn(),
  updateById: vi.fn(),
  deleteById: vi.fn(),
};

const ctrl = createBuyersController(svc);

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

const formattedData = data.map(({ id, ...rest }) => rest);

describe("BuyersController", () => {
  describe("GET /", () => {
    it("returns 200 with buyers data and nextCursor", async () => {
      vi.mocked(svc.list).mockResolvedValue({
        data,
        nextCursor: null,
      });

      const res = await app.request("/");
      expect(res.status).toBe(200);
    });
  });

  describe("POST /", () => {
    it("returns 201 on successful create", async () => {
      vi.mocked(svc.create).mockResolvedValue(data[0]);

      const res = await app.request("/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formattedData[0]),
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
    it("returns 200 if buyer exists", async () => {
      vi.mocked(svc.getById).mockResolvedValue(data[0]);
      const res = await app.request("/1");
      expect(res.status).toBe(200);
    });

    it("returns 404 if no buyers exist", async () => {
      vi.mocked(svc.getById).mockRejectedValue(
        new AppError("Buyer not found", 404),
      );

      const res = await app.request("/1");
      expect(res.status).toBe(404);
    });
  });

  describe("PUT /:id", () => {
    it("returns 200 on successful update", async () => {
      vi.mocked(svc.updateById).mockResolvedValue(data[0]);

      const res = await app.request("/1", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formattedData[0]),
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
        body: JSON.stringify(formattedData[0]),
      });

      expect(res.status).toBe(400);
    });

    it("returns 404 if no buyers exist", async () => {
      vi.mocked(svc.updateById).mockRejectedValue(
        new AppError("Buyer not found", 404),
      );

      const res = await app.request("/1", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formattedData[0]),
      });

      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /:id", () => {
    it("returns 200 on successful delete", async () => {
      vi.mocked(svc.deleteById).mockResolvedValue(data[0]);
      const res = await app.request("/1", { method: "DELETE" });
      expect(res.status).toBe(200);
    });

    it("returns 404 if no buyers exist", async () => {
      vi.mocked(svc.deleteById).mockRejectedValue(
        new AppError("Buyer not found", 404),
      );

      const res = await app.request("/1", { method: "DELETE" });
      expect(res.status).toBe(404);
    });
  });
});
