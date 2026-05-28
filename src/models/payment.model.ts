import { relations } from "drizzle-orm";
import { integer, pgTable, varchar } from "drizzle-orm/pg-core";
import { orders } from "./order.model";

export const payments = pgTable("payments", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 10 }).notNull(),
});

export const paymentsRelations = relations(payments, ({ many }) => ({
  orders: many(orders),
}));

export type Payment = typeof payments.$inferSelect;
