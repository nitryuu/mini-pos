import { DB } from "@/lib/db";
import { decodeCursor, encodeCursor } from "@/lib/pagination";
import { Buyer, buyers } from "@/models";
import {
  BuyerInput,
  ListBuyersInput,
  ListBuyersResponse,
} from "@/schemas/buyer.schema";
import { and, eq, gt, ilike, or } from "drizzle-orm";

export interface IBuyersRepository {
  list(input: ListBuyersInput): Promise<ListBuyersResponse>;
  getById(id: number): Promise<Buyer | undefined>;
  updateById(id: number, input: BuyerInput): Promise<Buyer | undefined>;
  create(input: BuyerInput): Promise<Buyer>;
  deleteById(id: number): Promise<Buyer | undefined>;
}

type BuyerCursor = {
  id: number;
  name: string;
};

export class BuyersRepository implements IBuyersRepository {
  constructor(private db: DB) { }

  async list({
    cursor,
    limit = 10,
    search,
  }: ListBuyersInput): Promise<ListBuyersResponse> {
    const c = cursor ? decodeCursor<BuyerCursor>(cursor) : undefined;

    const rows = await this.db.query.buyers.findMany({
      where: and(
        search ? ilike(buyers.name, `%${search}%`) : undefined,
        c
          ? or(
            gt(buyers.name, c.name),
            and(eq(buyers.name, c.name), gt(buyers.id, c.id)),
          )
          : undefined,
      ),
      orderBy: [buyers.name, buyers.id],
      limit: limit + 1,
    });

    const hasNextPage = rows.length > limit;
    const data = hasNextPage ? rows.slice(0, limit) : rows;
    const last = hasNextPage ? data[data.length - 1] : null;

    return {
      data,
      nextCursor: last
        ? encodeCursor<BuyerCursor>({ id: last.id, name: last.name })
        : null,
    };
  }

  async create(input: BuyerInput): Promise<Buyer> {
    const [res] = await this.db.insert(buyers).values(input).returning();
    return res;
  }

  getById(id: number): Promise<Buyer | undefined> {
    return this.db.query.buyers.findFirst({
      where: eq(buyers.id, id),
    });
  }

  async updateById(id: number, input: BuyerInput): Promise<Buyer | undefined> {
    const [res] = await this.db
      .update(buyers)
      .set(input)
      .where(eq(buyers.id, id))
      .returning();

    return res as Buyer | undefined;
  }

  async deleteById(id: number): Promise<Buyer | undefined> {
    const [res] = await this.db
      .delete(buyers)
      .where(eq(buyers.id, id))
      .returning();

    return res as Buyer | undefined;
  }
}
