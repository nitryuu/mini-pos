import { OrderItemResponse } from "@/models";
import { OrderResponse } from "@/models/order.model";
import z from "zod";

export const listOrdersSchema = z.object({
  cursor: z.string().nullish(),
  date: z.date().optional(),
  limit: z.coerce.number<string>().min(1).max(100).default(10).optional(),
});

export type ListOrdersInput = z.infer<typeof listOrdersSchema>;
export type ListOrdersResponse = {
  data: OrderResponse[];
  nextCursor: string | null;
};

export type OrderDetailResponse = OrderResponse & {
  items: OrderItemResponse[];
};

export const orderParamSchema = z.object({
  id: z.coerce.number<string>(),
});

export const orderSchema = z.object({
  paymentId: z.number().min(1),
  buyerId: z.number().min(1).nullable(),
  paid: z.number().min(1).transform(String),
  date: z.date().nullable(),
  items: z
    .array(
      z.object({
        productId: z.number().min(1),
        qty: z.number().min(1),
        price: z.number().min(1).transform(String),
      }),
    )
    .min(1),
});

export type OrderInput = z.infer<typeof orderSchema>;
