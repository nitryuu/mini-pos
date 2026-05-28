import { createAuthController } from "@/controllers/auth.ctrl";
import { db } from "@/lib/db";
import { redis } from "@/lib/redis";
import { UsersRepository } from "@/repositories/users.repo";
import { AuthService } from "@/services/auth.svc";
import { Hono } from "hono";

const repo = new UsersRepository(db);
const svc = new AuthService(repo, redis);
const ctrl = createAuthController(svc);

export const authRoutes = new Hono();
authRoutes.post("/refresh", ...ctrl.refresh);
authRoutes.post("/login", ...ctrl.login);
authRoutes.post("/logout", ...ctrl.logout);
