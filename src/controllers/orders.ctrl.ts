import {
  listOrdersSchema,
  orderParamSchema,
  orderSchema,
} from "@/schemas/order.schema";
import { IOrdersService } from "@/services/orders.svc";
import { zValidator } from "@hono/zod-validator";
import { createFactory } from "hono/factory";

const factory = createFactory();

export function createOrdersController(svc: IOrdersService) {
  const list = factory.createHandlers(
    zValidator("query", listOrdersSchema),
    async (c) => {
      const query = c.req.valid("query");
      const data = await svc.list(query);
      return c.json({ success: true, ...data });
    },
  );

  const getById = factory.createHandlers(
    zValidator("param", orderParamSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const data = await svc.getById(id);
      return c.json({ success: true, data });
    },
  );

  const create = factory.createHandlers(
    zValidator("json", orderSchema),
    async (c) => {
      const body = c.req.valid("json");
      const data = await svc.create(body);
      return c.json({ success: true, data }, 201);
    },
  );

  const updateById = factory.createHandlers(
    zValidator("param", orderParamSchema),
    zValidator("json", orderSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const body = c.req.valid("json");
      const data = await svc.updateById(id, body);
      return c.json({ success: true, data });
    },
  );

  const deleteById = factory.createHandlers(
    zValidator("param", orderParamSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const data = await svc.deleteById(id);
      return c.json({ success: true, data });
    },
  );

  return { list, getById, create, updateById, deleteById };
}
