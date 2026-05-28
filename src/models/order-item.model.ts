import { index, integer, numeric, pgTable, text } from "drizzle-orm/pg-core";
import { orders } from "./order.model";
import { products } from "./product.model";
import { relations } from "drizzle-orm";

export const orderItems = pgTable(
  "order_items",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    orderId: integer()
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: integer().references(() => products.id, {
      onDelete: "set null",
    }),

    name: text().notNull(),
    qty: integer().notNull(),
    price: numeric().notNull(),
    total: numeric().notNull(),
  },
  (table) => [
    index("idx_order_items_order_id").on(table.orderId),
    index("idx_order_items_product_id").on(table.productId),
  ],
);

export const productsRelations = relations(orderItems, ({ one }) => ({
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
}));

export type OrderItem = typeof orderItems.$inferSelect;
export type OrderItemResponse = Omit<OrderItem, "price" | "total"> & {
  price: number;
  total: number;
};
