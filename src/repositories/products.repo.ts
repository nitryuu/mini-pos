import { DB } from "@/lib/db";
import { decodeCursor, encodeCursor } from "@/lib/pagination";
import { ProductResponse, products } from "@/models/product.model";
import {
  ListProductsInput,
  ListProductsResponse,
  ProductInput,
} from "@/schemas/product.schema";
import dayjs from "dayjs";
import { and, eq, gt, ilike, or } from "drizzle-orm";

export interface IProductsRepository {
  list(input: ListProductsInput): Promise<ListProductsResponse>;
  create(input: ProductInput): Promise<ProductResponse | "barcode_in_use">;
  getById(id: number): Promise<ProductResponse | undefined>;
  getByBarcode(barcode: string): Promise<ProductResponse | undefined>;
  updateById(
    id: number,
    input: ProductInput,
  ): Promise<
    | (ProductResponse & { oldImage: string | null })
    | "barcode_in_use"
    | undefined
  >;
  deleteById(id: number): Promise<ProductResponse | undefined>;
}

type ProductCursor = {
  id: number;
  createdAt: number;
};

export function toResponse<T extends { price: string }>(
  from: T,
): Omit<T, "price"> & { price: number } {
  return { ...from, price: parseFloat(from.price) };
}

export class ProductsRepository implements IProductsRepository {
  constructor(private db: DB) { }

  async list({
    cursor,
    search,
    limit = 10,
  }: ListProductsInput): Promise<ListProductsResponse> {
    const c = cursor ? decodeCursor<ProductCursor>(cursor) : null;

    const rows = await this.db.query.products.findMany({
      where: and(
        search
          ? or(
            ilike(products.name, `%${search}%`),
            eq(products.barcode, search),
          )
          : undefined,
        c
          ? or(
            gt(products.createdAt, dayjs(c.createdAt).toDate()),
            and(
              eq(products.createdAt, dayjs(c.createdAt).toDate()),
              gt(products.id, c.id),
            ),
          )
          : undefined,
      ),
      orderBy: [products.createdAt, products.id],
      limit: limit + 1,
    });

    const hasNextPage = rows.length > limit;
    const data = hasNextPage ? rows.slice(0, limit) : rows;
    const last = hasNextPage ? data[data.length - 1] : null;

    return {
      data: data.map(toResponse),
      nextCursor: last
        ? encodeCursor<ProductCursor>({
          id: last.id,
          createdAt: last.createdAt.getTime(),
        })
        : null,
    };
  }

  async create(
    input: ProductInput,
  ): Promise<ProductResponse | "barcode_in_use"> {
    try {
      const [res] = await this.db.insert(products).values(input).returning();
      return toResponse(res);
    } catch (err: any) {
      if (err.code === "23505") return "barcode_in_use";
      throw err;
    }
  }

  async getById(id: number): Promise<ProductResponse | undefined> {
    const res = await this.db.query.products.findFirst({
      where: eq(products.id, id),
    });

    return res ? toResponse(res) : undefined;
  }

  async getByBarcode(barcode: string): Promise<ProductResponse | undefined> {
    const res = await this.db.query.products.findFirst({
      where: eq(products.barcode, barcode),
    });

    return res ? toResponse(res) : undefined;
  }

  async updateById(
    id: number,
    input: ProductInput,
  ): Promise<
    | (ProductResponse & { oldImage: string | null })
    | "barcode_in_use"
    | undefined
  > {
    return await this.db.transaction(async (tx) => {
      const [product] = await tx
        .select()
        .from(products)
        .where(eq(products.id, id))
        .for("no key update");

      if (!product) return undefined;

      try {
        const [updated] = await tx
          .update(products)
          .set(input)
          .where(eq(products.id, id))
          .returning();

        return { ...toResponse(updated), oldImage: product.image };
      } catch (err: any) {
        if (err.code === "23505") return "barcode_in_use";
        throw err;
      }
    });
  }

  async deleteById(id: number): Promise<ProductResponse | undefined> {
    const [res] = await this.db
      .delete(products)
      .where(eq(products.id, id))
      .returning();

    return res ? toResponse(res) : undefined;
  }
}
