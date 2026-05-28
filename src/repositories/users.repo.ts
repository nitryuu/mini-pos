import { DB } from "@/lib/db";
import { decodeCursor, encodeCursor } from "@/lib/pagination";
import { User, users } from "@/models";
import {
  UserInput,
  UserResponse,
  ListUsersInput,
  ListUsersResponse,
} from "@/schemas/user.schema";
import dayjs from "dayjs";
import { and, count, eq, gt, ilike, or, sql } from "drizzle-orm";

export interface IUsersRepository {
  list(input: ListUsersInput): Promise<ListUsersResponse>;
  getById(id: number): Promise<User | undefined>;
  getByEmail(email: string): Promise<User | undefined>;
  create(input: UserInput): Promise<UserResponse | "email_in_use">;
  updateById(
    id: number,
    input: UserInput,
  ): Promise<User | "email_in_use" | undefined>;
  deleteById(
    id: number,
    userId: number,
  ): Promise<User | "self_deletion" | "last_admin" | undefined>;
}

type UserCursor = {
  id: number;
  createdAt: number;
};

export class UsersRepository implements IUsersRepository {
  constructor(private db: DB) { }

  async list({
    cursor,
    search,
    limit = 10,
  }: ListUsersInput): Promise<ListUsersResponse> {
    const c = cursor ? decodeCursor<UserCursor>(cursor) : null;

    const rows = await this.db.query.users.findMany({
      where: and(
        search
          ? or(ilike(users.name, `%${search}%`), eq(users.email, search))
          : undefined,
        c
          ? or(
            gt(users.createdAt, dayjs(c.createdAt).toDate()),
            and(
              eq(users.createdAt, dayjs(c.createdAt).toDate()),
              gt(users.id, c.id),
            ),
          )
          : undefined,
      ),
      orderBy: [users.createdAt, users.id],
      limit: limit + 1,
    });

    const hasNextPage = rows.length > limit;
    const data = hasNextPage ? rows.slice(0, limit) : rows;
    const last = hasNextPage ? data[data.length - 1] : null;

    return {
      data,
      nextCursor: last
        ? encodeCursor<UserCursor>({
          id: last.id,
          createdAt: last.createdAt.getTime(),
        })
        : null,
    };
  }

  getById(id: number): Promise<User | undefined> {
    return this.db.query.users.findFirst({
      where: eq(users.id, id),
    });
  }

  getByEmail(email: string): Promise<User | undefined> {
    return this.db.query.users.findFirst({
      where: eq(users.email, email),
    });
  }

  async create(input: UserInput): Promise<UserResponse | "email_in_use"> {
    try {
      const [res] = await this.db.insert(users).values(input).returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
      });

      return res;
    } catch (err: any) {
      if (err.code === "23505") return "email_in_use";
      throw err;
    }
  }

  async updateById(
    id: number,
    input: UserInput,
  ): Promise<User | "email_in_use" | undefined> {
    try {
      const [res] = await this.db
        .update(users)
        .set(input)
        .where(eq(users.id, id))
        .returning();

      return res as User | undefined;
    } catch (err: any) {
      if (err.code === "23505") return "email_in_use";
      throw err;
    }
  }

  async deleteById(
    id: number,
    userId: number,
  ): Promise<User | "self_deletion" | "last_admin" | undefined> {
    return this.db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(users)
        .where(eq(users.id, id))
        .for("no key update");

      if (!existing) return;
      if (existing.id === userId) return "self_deletion";

      if (existing.role === "admin") {
        await tx.execute(sql`
          SELECT pg_advisory_xact_lock(hashtext('admin_count_check'))
        `);

        const [{ adminCount }] = await tx
          .select({ adminCount: count() })
          .from(users)
          .where(eq(users.role, "admin"));

        if (adminCount <= 1) return "last_admin";
      }

      await tx.delete(users).where(eq(users.id, id));
      return existing;
    });
  }
}
