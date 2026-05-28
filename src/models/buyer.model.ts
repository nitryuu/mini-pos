import { relations } from "drizzle-orm";
import { index, integer, pgTable, text } from "drizzle-orm/pg-core";
import { orders } from "./order.model";

export const buyers = pgTable(
  "buyers",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    name: text().notNull(),
    note: text(),
  },
  (table) => [index("idx_buyers_name").on(table.name)],
);

export const buyersRelations = relations(buyers, ({ many }) => ({
  orders: many(orders),
}));

export type Buyer = typeof buyers.$inferSelect;
