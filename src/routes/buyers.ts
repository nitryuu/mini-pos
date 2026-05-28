import { createBuyersController } from "@/controllers/buyers.ctrl";
import { db } from "@/lib/db";
import { BuyersRepository } from "@/repositories/buyers.repo";
import { BuyersService } from "@/services/buyers.svc";
import { Hono } from "hono";

const repo = new BuyersRepository(db);
const svc = new BuyersService(repo);
const ctrl = createBuyersController(svc);

export const buyersRoutes = new Hono();
buyersRoutes.get("/", ...ctrl.list);
buyersRoutes.post("/", ...ctrl.create);
buyersRoutes.get("/:id", ...ctrl.getById);
buyersRoutes.put("/:id", ...ctrl.updateById);
buyersRoutes.delete("/:id", ...ctrl.deleteById);
