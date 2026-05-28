import { relations } from "drizzle-orm";
import {
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { notifications } from "./notification.model";

export const usersRoles = pgEnum("users_roles", ["admin", "cashier"]);

export const users = pgTable(
  "users",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    name: text().notNull(),
    email: text().notNull().unique(),
    password: text().notNull(),
    role: usersRoles().notNull().default("cashier"),
    createdAt: timestamp().notNull().defaultNow(),
  },
  (table) => [
    index("idx_users_name").on(table.name),
    index("idx_users_name_role").on(table.name, table.role),
    index("idx_users_name_created_at").on(table.name, table.createdAt),
  ],
);

export const usersRelations = relations(users, ({ many }) => ({
  notifications: many(notifications),
}));

export type User = typeof users.$inferSelect;
