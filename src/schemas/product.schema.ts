import { ProductResponse, products } from "@/models";
import { createInsertSchema } from "drizzle-zod";
import z from "zod";

export const listProductsSchema = z.object({
  cursor: z.string().nullish(),
  search: z.string().optional(),
  limit: z.coerce.number<string>().min(1).max(100).default(10).optional(),
});

export type ListProductsInput = z.infer<typeof listProductsSchema>;
export type ListProductsResponse = {
  data: ProductResponse[];
  nextCursor: string | null;
};

export const productSchema = createInsertSchema(products, {
  barcode: (schema) => schema.optional().transform((val) => val || null),
  image: (schema) => schema.optional().transform((val) => val || null),
  price: z.coerce.string<number>(),
});

export type ProductInput = z.infer<typeof productSchema>;

export const productParamSchema = z.object({
  id: z.coerce.number<string>(),
});
