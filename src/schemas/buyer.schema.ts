import { Buyer, buyers } from "@/models";
import { createInsertSchema } from "drizzle-zod";
import z from "zod";

export const listBuyersSchema = z.object({
  cursor: z.string().nullish(),
  search: z.string().optional(),
  limit: z.coerce.number<string>().min(1).max(100).default(10).optional(),
});

export type ListBuyersInput = z.infer<typeof listBuyersSchema>;
export type ListBuyersResponse = {
  data: Buyer[];
  nextCursor: string | null;
};

export const buyerSchema = createInsertSchema(buyers, {
  note: (schema) => schema.optional().transform((val) => val || null),
});

export type BuyerInput = z.infer<typeof buyerSchema>;

export const buyerParamSchema = z.object({
  id: z.coerce.number<string>(),
});
