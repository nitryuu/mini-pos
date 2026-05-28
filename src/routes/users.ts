import { createUsersController } from "@/controllers/users.ctrl";
import { db } from "@/lib/db";
import { redis } from "@/lib/redis";
import { UsersRepository } from "@/repositories/users.repo";
import { UsersService } from "@/services/users.svc";
import { Hono } from "hono";

const repo = new UsersRepository(db);
const svc = new UsersService(repo, redis);
const ctrl = createUsersController(svc);

export const usersRoutes = new Hono();
usersRoutes.post("/", ...ctrl.register);
usersRoutes.put("/:id", ...ctrl.updateById);
usersRoutes.delete("/:id", ...ctrl.deleteById);
