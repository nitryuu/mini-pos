import { createProductsController } from "@/controllers/products.ctrl";
import { db } from "@/lib/db";
import { redis } from "@/lib/redis";
import { ProductsRepository } from "@/repositories/products.repo";
import { ProductsService } from "@/services/products.svc";
import { Hono } from "hono";

const repo = new ProductsRepository(db);
const svc = new ProductsService(repo, redis);
const ctrl = createProductsController(svc);

export const productsRoutes = new Hono();
productsRoutes.get("/", ...ctrl.list);
productsRoutes.post("/", ...ctrl.create);
productsRoutes.get("/:id", ...ctrl.getById);
