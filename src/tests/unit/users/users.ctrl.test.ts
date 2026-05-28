import { createUsersController } from "@/controllers/users.ctrl";
import { AppError } from "@/lib/error";
import { errorMiddleware } from "@/middleware/error";
import { notFoundMiddleware } from "@/middleware/not-found";
import { IUsersService } from "@/services/users.svc";
import { Context, Hono, Next } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { data } from "./data";
import dayjs from "dayjs";

const svc: IUsersService = {
  register: vi.fn(),
  updateById: vi.fn(),
  deleteById: vi.fn(),
};

const ctrl = createUsersController(svc);

function createApp() {
  const app = new Hono();

  app.use(async (c: Context, next: Next) => {
    c.set("user", {
      sub: 1,
      email: "John@gmail.com",
      role: "admin",
      exp: dayjs().add(15, "minute").unix(),
    });
    await next();
  });

  app.post("/", ...ctrl.register);
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

const formattedData = data.map(({ id, createdAt, ...rest }) => rest);

describe("UsersController", () => {
  describe("POST /", () => {
    it("returns 201 on successful create", async () => {
      vi.mocked(svc.register).mockResolvedValue(data[0]);

      const res = await app.request("/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formattedData[0]),
      });

      expect(res.status).toBe(201);
    });

    it("returns 400 if body is invalid", async () => {
      vi.mocked(svc.register).mockRejectedValue(
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

  describe("PUT /:id", () => {
    it("returns 200 if user exists", async () => {
      const hashed = await Bun.password.hash(data[0].name);
      vi.mocked(svc.updateById).mockResolvedValue({
        ...data[0],
        password: hashed,
      });

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
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(400);
    });

    it("returns 404 if no users exist", async () => {
      vi.mocked(svc.updateById).mockRejectedValue(
        new AppError("User not found", 404),
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
      const hashed = await Bun.password.hash("admin");
      vi.mocked(svc.deleteById).mockResolvedValue({
        ...data[0],
        password: hashed,
      });

      const res = await app.request("/1", { method: "DELETE" });
      expect(res.status).toBe(200);
    });

    it("returns 404 if no users exist", async () => {
      vi.mocked(svc.deleteById).mockRejectedValue(
        new AppError("User not found", 404),
      );

      const res = await app.request("/", { method: "DELETE" });
      expect(res.status).toBe(404);
    });
  });
});
