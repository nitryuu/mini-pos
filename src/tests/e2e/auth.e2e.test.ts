import { UsersRepository } from "@/repositories/users.repo";
import { getDb, useDb } from "../lib/with-db";
import { beforeAll, describe, expect, it } from "vitest";
import { AuthService } from "@/services/auth.svc";
import { createAuthController } from "@/controllers/auth.ctrl";
import { Hono } from "hono";
import { errorMiddleware } from "@/middleware/error";
import { notFoundMiddleware } from "@/middleware/not-found";
import { UsersService } from "@/services/users.svc";
import { createUsersController } from "@/controllers/users.ctrl";
import { getRedis, useRedis } from "../lib/with-redis";

useDb();
useRedis();

let app: Hono;

beforeAll(async () => {
  const repo = new UsersRepository(getDb());
  const authSvc = new AuthService(repo, getRedis());
  const authCtrl = createAuthController(authSvc);

  const usersSvc = new UsersService(repo, getRedis());
  const usersCtrl = createUsersController(usersSvc);

  app = new Hono().basePath("/api");

  app.post("/register", ...usersCtrl.register);

  const authRoutes = new Hono();
  authRoutes.post("/refresh", ...authCtrl.refresh);
  authRoutes.post("/login", ...authCtrl.login);
  authRoutes.post("/logout", ...authCtrl.logout);

  app.route("/auth", authRoutes);

  app.onError(errorMiddleware);
  app.notFound(notFoundMiddleware);
});

const register = async () => {
  await app.request("/api/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "John",
      email: "john@email.com",
      password: "john",
      role: "cashier",
    }),
  });
};

const login = async () => {
  return await app.request("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "john@email.com",
      password: "john",
    }),
  });
};

describe("Auth E2E", () => {
  describe("POST /api/auth/refresh", () => {
    it("returns access token and set new refresh token to cookie", async () => {
      await register();
      const loginRes = await login();
      const cookie = loginRes.headers.get("set-cookie");

      const first = await app.request("/api/auth/refresh", {
        method: "POST",
        headers: { Cookie: cookie! },
      });

      const newCookie = first.headers.get("set-cookie");

      expect(first.status).toBe(200);
      expect(newCookie).not.toBeNull();
      expect(newCookie).not.toBe(cookie);

      const second = await app.request("/api/auth/refresh", {
        method: "POST",
        headers: { Cookie: newCookie! },
      });

      expect(second.status).toBe(200);

      const third = await app.request("/api/auth/refresh", {
        method: "POST",
        headers: { Cookie: cookie! },
      });

      expect(third.status).toBe(401);
    });
  });

  describe("POST /api/auth/login", () => {
    it("returns access token and set refresh token to cookie", async () => {
      await register();
      const loginRes = await login();
      expect(loginRes.status).toBe(200);

      const cookie = loginRes.headers.get("set-cookie");
      expect(cookie).not.toBeNull();

      const body = await loginRes.json();
      expect(body.data.accessToken).toBeDefined();

      const res = await app.request("/api/auth/refresh", {
        method: "POST",
        headers: { Cookie: cookie! },
      });

      expect(res.status).toBe(200);
    });
  });

  describe("POST /api/auth/logout", () => {
    it("invalidates refresh token", async () => {
      await register();
      const loginRes = await login();
      const cookie = loginRes.headers.get("set-cookie");

      await app.request("/api/auth/logout", {
        method: "POST",
        headers: { Cookie: cookie! },
      });

      const res = await app.request("/api/auth/refresh", {
        method: "POST",
        headers: { Cookie: cookie! },
      });

      expect(res.status).toBe(401);
    });
  });
});
