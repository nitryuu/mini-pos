import { userParamSchema, userSchema } from "@/schemas/user.schema";
import { IUsersService } from "@/services/users.svc";
import { zValidator } from "@hono/zod-validator";
import { createFactory } from "hono/factory";

const factory = createFactory();

export function createUsersController(svc: IUsersService) {
  const register = factory.createHandlers(
    zValidator("json", userSchema),
    async (c) => {
      const body = c.req.valid("json");
      const data = await svc.register(body);
      return c.json({ success: true, data }, 201);
    },
  );

  const updateById = factory.createHandlers(
    zValidator("param", userParamSchema),
    zValidator("json", userSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const body = c.req.valid("json");
      const token = c.req.header("Authorization")?.replace("Bearer ", "")!;

      const data = await svc.updateById(id, body, token);
      return c.json({ success: true, data });
    },
  );

  const deleteById = factory.createHandlers(
    zValidator("param", userParamSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const user = c.get("user");
      const token = c.req.header("Authorization")?.replace("Bearer ", "")!;
      const data = await svc.deleteById(id, user.sub, token);
      return c.json({ success: true, data });
    },
  );

  return { register, updateById, deleteById };
}
