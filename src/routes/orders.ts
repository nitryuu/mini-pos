import { createOrdersController } from "@/controllers/orders.ctrl";
import { db } from "@/lib/db";
import { redis } from "@/lib/redis";
import { OrdersRepository } from "@/repositories/orders.repo";
import { OrdersService } from "@/services/orders.svc";
import { Hono } from "hono";

const repo = new OrdersRepository(db);
const svc = new OrdersService(repo, redis);
const ctrl = createOrdersController(svc);

export const ordersRoutes = new Hono();
ordersRoutes.get("/", ...ctrl.list);
ordersRoutes.get("/:id", ...ctrl.getById);
ordersRoutes.post("/", ...ctrl.create);
ordersRoutes.put("/:id", ...ctrl.updateById);
ordersRoutes.delete("/:id", ...ctrl.deleteById);
