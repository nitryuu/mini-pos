import {
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const products = pgTable(
  "products",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    barcode: text().unique(),
    name: text().notNull(),
    qty: integer().notNull(),
    price: numeric().notNull(),
    image: text(),
    createdAt: timestamp().notNull().defaultNow(),
  },
  (table) => [
    index("idx_products_name").on(table.name),
    index("idx_products_name_created_at").on(table.name, table.createdAt),
  ],
);

export type Product = typeof products.$inferSelect;
export type ProductResponse = Omit<Product, "price"> & { price: number };
