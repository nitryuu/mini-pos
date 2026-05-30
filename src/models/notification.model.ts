import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  timestamp,
} from "drizzle-orm/pg-core";
import { users } from "./user.model";
import { relations } from "drizzle-orm";

export const notificationTypes = pgEnum("notification_types", [
  "system:announcement",
  "order:created",
  "order:updated",
  "order:deleted",
  "product:created",
  "product:updated",
  "product:deleted",
  "product:low_stock",
  "product:out_of_stock",
  "export:completed",
  "export:failed",
  "export:progress",
]);

const usersRoles = pgEnum("users_roles", ["admin", "cashier"]);

export const notifications = pgTable(
  "notifications",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    userId: integer().references(() => users.id, { onDelete: "cascade" }),
    role: usersRoles(),
    type: notificationTypes().notNull(),
    data: jsonb().notNull(),
    readAt: timestamp(),
    createdAt: timestamp().notNull().defaultNow(),
  },
  (table) => [
    index("idx_notifications_user_id").on(table.userId),
    index("idx_notifications_user_id_role_type").on(
      table.userId,
      table.role,
      table.type,
    ),
    index("idx_notifications_created_at").on(table.createdAt),
  ],
);

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

export const notificationTypesValues = notificationTypes.enumValues;

export type Notification = typeof notifications.$inferSelect;
export type NotificationType = Notification["type"];
