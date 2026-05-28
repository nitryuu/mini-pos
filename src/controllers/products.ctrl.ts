import {
  listProductsSchema,
  productParamSchema,
  productSchema,
} from "@/schemas/product.schema";
import { IProductsService } from "@/services/products.svc";
import { zValidator } from "@hono/zod-validator";
import { createFactory } from "hono/factory";

const factory = createFactory();
export function createProductsController(svc: IProductsService) {
  const list = factory.createHandlers(
    zValidator("query", listProductsSchema),
    async (c) => {
      const query = c.req.valid("query");
      const data = await svc.list(query);
      return c.json({ success: true, ...data });
    },
  );

  const create = factory.createHandlers(
    zValidator("json", productSchema),
    async (c) => {
      const body = c.req.valid("json");
      const data = await svc.create(body);
      return c.json({ success: true, data }, 201);
    },
  );

  const getById = factory.createHandlers(
    zValidator("param", productParamSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const data = await svc.getById(id);
      return c.json({ success: true, data });
    },
  );

  const updateById = factory.createHandlers(
    zValidator("param", productParamSchema),
    zValidator("json", productSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const body = c.req.valid("json");
      const data = await svc.updateById(id, body);
      return c.json({ success: true, data });
    },
  );

  const deleteById = factory.createHandlers(
    zValidator("param", productParamSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const data = await svc.deleteById(id);
      return c.json({ success: true, data });
    },
  );

  return { list, create, getById, updateById, deleteById };
}
