import {
  index,
  integer,
  numeric,
  pgTable,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { buyers } from "./buyer.model";
import { relations } from "drizzle-orm";
import { orderItems } from "./order-item.model";
import { payments } from "./payment.model";

export const orders = pgTable(
  "orders",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    orderNumber: varchar({ length: 20 }).notNull().unique(),
    paymentId: integer()
      .notNull()
      .references(() => payments.id, { onDelete: "cascade" }),
    buyerId: integer().references(() => buyers.id, {
      onDelete: "set null",
    }),
    total: numeric().notNull(),
    createdAt: timestamp().notNull().defaultNow(),
  },
  (table) => [
    index("idx_orders_payment_id").on(table.paymentId),
    index("idx_orders_buyer_id").on(table.buyerId),
    index("idx_orders_created_at").on(table.createdAt),
  ],
);

export const ordersRelations = relations(orders, ({ one, many }) => ({
  payment: one(payments, {
    fields: [orders.paymentId],
    references: [payments.id],
  }),
  buyer: one(buyers, {
    fields: [orders.buyerId],
    references: [buyers.id],
  }),
  items: many(orderItems),
}));

export type Order = typeof orders.$inferSelect;
export type OrderResponse = Omit<Order, "total"> & {
  total: number;
};
