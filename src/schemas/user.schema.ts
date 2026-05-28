import { User, users } from "@/models";
import { createInsertSchema } from "drizzle-zod";
import z from "zod";

export const listUsersSchema = z.object({
  cursor: z.string().nullish(),
  search: z.string().optional(),
  limit: z.coerce.number<string>().min(1).max(100).default(10).optional(),
});

export type ListUsersInput = z.infer<typeof listUsersSchema>;
export type ListUsersResponse = {
  data: User[];
  nextCursor: string | null;
};

export const userSchema = createInsertSchema(users, {
  role: (schema) => schema,
});

export type UserInput = z.infer<typeof userSchema>;
export type UserResponse = Omit<User, "password">;

export const userParamSchema = z.object({
  id: z.coerce.number<string>(),
});
