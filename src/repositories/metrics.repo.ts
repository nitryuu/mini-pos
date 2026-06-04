import { DB } from "@/lib/db";
import { orderItems, orders } from "@/models";
import { MetricsResponse } from "@/schemas/metric.schema";
import dayjs from "dayjs";
import { desc, eq, gte, sql } from "drizzle-orm";

export interface IMetricsRepository {
  getMetrics(): Promise<MetricsResponse>;
}

export class MetricsRepository implements IMetricsRepository {
  constructor(private db: DB) {}

  async getMetrics(): Promise<MetricsResponse> {
    const startOfDay = dayjs().startOf("day").toDate();

    const [orderMetrics, topProducts] = await Promise.all([
      this.db
        .select({
          totalOrders: sql<string>`COUNT(*)`,
          totalRevenue: sql<string>`SUM(${orders.total})`,
        })
        .from(orders)
        .where(gte(orders.createdAt, startOfDay)),
      this.db
        .select({
          productId: orderItems.productId,
          name: orderItems.name,
          totalQty: sql<string>`SUM(${orderItems.qty})`,
          totalRevenue: sql<string>`SUM(${orderItems.total})`,
        })
        .from(orderItems)
        .innerJoin(orders, eq(orderItems.orderId, orders.id))
        .where(gte(orders.createdAt, startOfDay))
        .groupBy(orderItems.productId, orderItems.name)
        .orderBy(desc(sql`SUM(${orderItems.qty})`))
        .limit(5),
    ]);

    return {
      totalOrders: +orderMetrics[0].totalOrders,
      totalRevenue: parseFloat(orderMetrics[0].totalRevenue),
      topProducts: topProducts.map((p) => ({
        ...p,
        totalQty: +p.totalQty,
        totalRevenue: parseFloat(p.totalRevenue),
      })),
      updatedAt: dayjs().toISOString(),
    };
  }
}
