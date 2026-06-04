import { IPaymentsService } from "@/services/payments.svc";
import { createFactory } from "hono/factory";

const factory = createFactory();
export function createPaymentsController(svc: IPaymentsService) {
  const list = factory.createHandlers(async (c) => {
    const data = await svc.list();
    return c.json({ success: true, data });
  });

  return { list };
}
