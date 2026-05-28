import { DB } from "@/lib/db";
import { decodeCursor, encodeCursor } from "@/lib/pagination";
import {
  Order,
  OrderItem,
  orderItems,
  OrderResponse,
  orders,
  products,
} from "@/models";
import {
  ListOrdersInput,
  ListOrdersResponse,
  OrderDetailResponse,
  OrderInput,
} from "@/schemas/order.schema";
import dayjs from "dayjs";
import { and, eq, gt, gte, ilike, inArray, lte, or, sql } from "drizzle-orm";
import { QueryResult } from "pg";

export interface IOrdersRepository {
  list(input: ListOrdersInput): Promise<ListOrdersResponse>;
  getById(id: number): Promise<OrderDetailResponse | undefined>;
  create(input: OrderInput): Promise<{
    order: OrderDetailResponse | "product_not_found" | "insufficient_stock";
    affectedProducts: { productId: number; qty: number }[];
  }>;
  updateById(
    id: number,
    input: OrderInput,
  ): Promise<
    | {
      order: OrderDetailResponse | "product_not_found" | "insufficient_stock";
      affectedProducts: { productId: number; qty: number }[];
    }
    | undefined
  >;
  deleteById(id: number): Promise<
    | {
      order: OrderResponse;
      affectedProducts: number[];
    }
    | undefined
  >;
}

type OrderCursor = {
  id: number;
  createdAt: number;
};

export function toListOrderResponse(from: Order): OrderResponse {
  return { ...from, total: parseFloat(from.total) };
}

export function toOrderDetailResponse(
  from: Order & { items: OrderItem[] },
): OrderDetailResponse {
  return {
    ...from,
    total: parseFloat(from.total),
    items: from.items.map((it) => ({
      ...it,
      price: parseFloat(it.price),
      total: parseFloat(it.total),
    })),
  };
}

export class OrdersRepository implements IOrdersRepository {
  constructor(private db: DB) { }

  async list({
    cursor,
    date,
    limit = 10,
  }: ListOrdersInput): Promise<ListOrdersResponse> {
    const c = cursor ? decodeCursor<OrderCursor>(cursor) : null;

    const rows = await this.db.query.orders.findMany({
      where: and(
        date
          ? and(
            gte(orders.createdAt, dayjs(date).startOf("day").toDate()),
            lte(orders.createdAt, dayjs(date).endOf("day").toDate()),
          )
          : undefined,
        c
          ? or(
            gt(orders.createdAt, dayjs(c.createdAt).toDate()),
            and(
              eq(orders.createdAt, dayjs(c.createdAt).toDate()),
              gt(orders.id, c.id),
            ),
          )
          : undefined,
      ),
      orderBy: [orders.createdAt, orders.id],
      limit: limit + 1,
    });

    const hasNextPage = rows.length > limit;
    const data = hasNextPage ? rows.slice(0, limit) : rows;
    const last = hasNextPage ? data[data.length - 1] : null;

    return {
      data: data.map(toListOrderResponse),
      nextCursor: last
        ? encodeCursor<OrderCursor>({
          id: last.id,
          createdAt: last.createdAt.getTime(),
        })
        : null,
    };
  }

  async getById(id: number): Promise<OrderDetailResponse | undefined> {
    const res = await this.db.query.orders.findFirst({
      where: eq(orders.id, id),
      with: { items: true },
    });

    return res ? toOrderDetailResponse(res) : undefined;
  }

  async create(input: OrderInput): Promise<{
    order: OrderDetailResponse | "product_not_found" | "insufficient_stock";
    affectedProducts: { productId: number; qty: number }[];
  }> {
    return this.db.transaction(async (tx) => {
      const createdAt = input.date || dayjs().toDate();

      await tx.execute(sql`
        SELECT pg_advisory_xact_lock(hashtext(${`order_number_${dayjs(createdAt).format("YYYYMMDD")}`}))
      `);

      const [seq] = await tx
        .select({
          maxSeq: sql<number>`
            COALESCE(
              MAX(
                CAST(right(${orders.orderNumber}, 4) AS INTEGER)
              ), 
              0
            )`.as("maxSeq"),
        })
        .from(orders)
        .where(
          ilike(
            orders.orderNumber,
            `ORD-${dayjs(createdAt).format("YYYYMMDD")}-%`,
          ),
        );

      const nextSeq = (seq?.maxSeq || 0) + 1;
      const orderNumber = `ORD-${dayjs(createdAt).format("YYYYMMDD")}-${nextSeq.toString().padStart(4, "0")}`;

      let total = 0;
      let items = new Map<number, { qty: number; price: number }>();
      let productIds = new Set<number>();

      for (let i = 0; i < input.items.length; i++) {
        const item = input.items[i];
        total += parseFloat(item.price) * item.qty;
        productIds.add(item.productId);
        items.set(item.productId, {
          qty: item.qty,
          price: parseFloat(item.price),
        });
      }

      const allProducts = await tx
        .select({ id: products.id, name: products.name, qty: products.qty })
        .from(products)
        .where(inArray(products.id, [...productIds]))
        .for("no key update");

      const productMap = new Map(allProducts.map((p) => [p.id, p]));
      const itemEntries = [...items];

      for (let i = 0; i < itemEntries.length; i++) {
        const [productId, item] = itemEntries[i];
        const product = productMap.get(productId);
        if (!product)
          return { order: "product_not_found", affectedProducts: [] };

        if (product.qty < item.qty)
          return { order: "insufficient_stock", affectedProducts: [] };
      }

      const [createdOrder] = await tx
        .insert(orders)
        .values({
          orderNumber,
          paymentId: input.paymentId,
          buyerId: input.buyerId,
          total: String(total),
          createdAt,
        })
        .returning();

      const allItems = [] as (Omit<OrderItem, "id" | "productId"> & {
        productId: number;
      })[];

      for (let i = 0; i < itemEntries.length; i++) {
        const [productId, item] = itemEntries[i];
        const product = productMap.get(productId)!;

        allItems.push({
          orderId: createdOrder.id,
          productId,
          name: product.name,
          qty: item.qty,
          price: String(item.price),
          total: String(item.qty * item.price),
        });
      }

      const createdOrderItems = await tx
        .insert(orderItems)
        .values(allItems)
        .returning();

      const data = { ...createdOrder, items: createdOrderItems };

      const updateProductsQty = [] as Promise<
        { productId: number; qty: number }[]
      >[];

      for (let i = 0; i < allItems.length; i++) {
        const item = allItems[i];
        updateProductsQty.push(
          tx
            .update(products)
            .set({ qty: sql`${products.qty} - ${item.qty}` })
            .where(eq(products.id, item.productId))
            .returning({ productId: products.id, qty: products.qty }),
        );
      }

      const affectedProducts = await Promise.all(updateProductsQty);
      return {
        order: toOrderDetailResponse(data),
        affectedProducts: affectedProducts.flat(),
      };
    });
  }

  async updateById(
    id: number,
    input: OrderInput,
  ): Promise<
    | {
      order: OrderDetailResponse | "product_not_found" | "insufficient_stock";
      affectedProducts: { productId: number; qty: number }[];
    }
    | undefined
  > {
    return this.db.transaction(async (tx) => {
      const [existingOrder] = await tx
        .select()
        .from(orders)
        .where(eq(orders.id, id))
        .for("no key update");

      if (!existingOrder) return undefined;

      const createdAt = input.date || dayjs().toDate();
      await tx.execute(sql`
        SELECT pg_advisory_xact_lock(hashtext(${`order_number_${dayjs(createdAt).format("YYYYMMDD")}`}))
      `);

      const [seq] = await tx
        .select({
          maxSeq: sql<number>`
            COALESCE(
              MAX(
                CAST(right(${orders.orderNumber}, 4) AS INTEGER)
              ), 
              0
            )`.as("maxSeq"),
        })
        .from(orders)
        .where(
          ilike(
            orders.orderNumber,
            `ORD-${dayjs(createdAt).format("YYYYMMDD")}-%`,
          ),
        );

      const nextSeq = (seq?.maxSeq || 0) + 1;
      const orderNumber = `ORD-${dayjs(createdAt).format("YYYYMMDD")}-${nextSeq.toString().padStart(4, "0")}`;

      const deletedOrderItems = await tx
        .delete(orderItems)
        .where(eq(orderItems.orderId, id))
        .returning({ productId: orderItems.productId, qty: orderItems.qty });

      let total = 0;
      let items = new Map<number, { qty: number; price: number }>();
      let productIds = new Set<number>();
      const effectiveQty = new Map<number, number>();

      for (let i = 0; i < deletedOrderItems.length; i++) {
        const item = deletedOrderItems[i];
        const productId = item.productId;
        if (!productId) continue;
        productIds.add(productId);
        effectiveQty.set(productId, item.qty);
      }

      for (let i = 0; i < input.items.length; i++) {
        const item = input.items[i];
        total += parseFloat(item.price) * item.qty;
        productIds.add(item.productId);
        items.set(item.productId, {
          qty: item.qty,
          price: parseFloat(item.price),
        });
      }

      const allProducts = await tx
        .select({ id: products.id, name: products.name, qty: products.qty })
        .from(products)
        .where(inArray(products.id, [...productIds]))
        .for("no key update");

      const productMap = new Map(allProducts.map((p) => [p.id, p]));

      for (let i = 0; i < allProducts.length; i++) {
        effectiveQty.set(
          allProducts[i].id,
          (effectiveQty.get(allProducts[i].id) || 0) + allProducts[i].qty,
        );
      }

      const itemEntries = [...items];

      for (let i = 0; i < itemEntries.length; i++) {
        const [productId, item] = itemEntries[i];
        const product = productMap.get(productId);
        const availableQty = effectiveQty.get(productId) || 0;

        if (!product)
          return { order: "product_not_found", affectedProducts: [] };

        if (availableQty < item.qty)
          return { order: "insufficient_stock", affectedProducts: [] };
      }

      const allItems = [] as (Omit<OrderItem, "id" | "productId"> & {
        productId: number;
      })[];

      for (let i = 0; i < itemEntries.length; i++) {
        const item = itemEntries[i];
        const product = productMap.get(item[0])!;
        allItems.push({
          orderId: existingOrder.id,
          productId: item[0],
          name: product.name,
          qty: item[1].qty,
          price: String(item[1].price),
          total: String(item[1].qty * item[1].price),
        });
      }

      const [[updatedOrder], createdOrderItems] = await Promise.all([
        tx
          .update(orders)
          .set({
            orderNumber,
            paymentId: input.paymentId,
            buyerId: input.buyerId,
            total: String(total),
            createdAt,
          })
          .where(eq(orders.id, id))
          .returning(),
        tx.insert(orderItems).values(allItems).returning(),
      ]);

      const qtyUpdates = [] as Promise<QueryResult<never>>[];
      for (let i = 0; i < deletedOrderItems.length; i++) {
        const { productId, qty } = deletedOrderItems[i];
        qtyUpdates.push(
          tx
            .update(products)
            .set({ qty: sql`${products.qty} + ${qty}` })
            .where(eq(products.id, productId!)),
        );
      }

      const qtyFinalUpdates = [] as Promise<
        { productId: number; qty: number }[]
      >[];

      for (let i = 0; i < allItems.length; i++) {
        const item = allItems[i];
        qtyFinalUpdates.push(
          tx
            .update(products)
            .set({ qty: sql`${products.qty} - ${item.qty}` })
            .where(eq(products.id, item.productId))
            .returning({ productId: products.id, qty: products.qty }),
        );
      }

      await Promise.all(qtyUpdates);
      const affectedProducts = (await Promise.all(qtyFinalUpdates)).flat();

      const data = { ...updatedOrder, items: createdOrderItems };
      return {
        order: toOrderDetailResponse(data),
        affectedProducts,
      };
    });
  }

  async deleteById(id: number): Promise<
    | {
      order: OrderResponse;
      affectedProducts: number[];
    }
    | undefined
  > {
    return this.db.transaction(async (tx) => {
      const [existingOrder] = await tx
        .select()
        .from(orders)
        .where(eq(orders.id, id))
        .for("no key update");

      if (!existingOrder) return undefined;

      const deletedOrderItems = await tx
        .delete(orderItems)
        .where(eq(orderItems.orderId, id))
        .returning({ productId: orderItems.productId, qty: orderItems.qty });

      const [deletedOrder] = await tx
        .delete(orders)
        .where(eq(orders.id, id))
        .returning();

      const qtyUpdates = [] as Promise<QueryResult<never>>[];
      const productIds = [] as number[];
      for (let i = 0; i < deletedOrderItems.length; i++) {
        const item = deletedOrderItems[i];
        if (!item.productId) continue;
        productIds.push(item.productId);
        qtyUpdates.push(
          tx
            .update(products)
            .set({ qty: sql`${products.qty} + ${item.qty}` })
            .where(eq(products.id, item.productId)),
        );
      }

      await Promise.all(qtyUpdates);
      return {
        order: toListOrderResponse(deletedOrder),
        affectedProducts: productIds,
      };
    });
  }
}
