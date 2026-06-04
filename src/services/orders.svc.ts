import { AppError } from "@/lib/error";
import { OrderResponse } from "@/models";
import { IOrdersRepository } from "@/repositories/orders.repo";
import {
  ListOrdersInput,
  ListOrdersResponse,
  OrderDetailResponse,
  OrderInput,
} from "@/schemas/order.schema";
import { wsManager } from "@/ws/manager";
import { LOW_STOCK_THRESHOLD } from "./products.svc";
import Redis from "ioredis";
import { config } from "@/config";
import { getCached, invalidateCachePattern } from "@/lib/cache";
import { metricsBroadcaster } from "@/lib/metrics-broadcaster";

export interface IOrdersService {
  list(input: ListOrdersInput): Promise<ListOrdersResponse>;
  getById(id: number): Promise<OrderDetailResponse>;
  create(input: OrderInput): Promise<OrderDetailResponse>;
  updateById(id: number, input: OrderInput): Promise<OrderDetailResponse>;
  deleteById(id: number): Promise<OrderResponse>;
}

const CACHE_KEY = {
  list: (params: string) => `orders:list:${params}`,
  getById: (id: number) => `orders:${id}`,
};

export const ERROR = {
  NOT_FOUND: new AppError("Order not found", 404),
  PRODUCT_NOT_FOUND: new AppError("Product not found", 404),
  INSUFFICIENT_STOCK: new AppError("Insufficient stock", 400),
};

export class OrdersService implements IOrdersService {
  constructor(
    private repo: IOrdersRepository,
    private redis: Redis,
  ) {}

  async list(input: ListOrdersInput): Promise<ListOrdersResponse> {
    const key = CACHE_KEY.list(JSON.stringify(input));
    const orders = await getCached(
      key,
      config.redis.cache.orders,
      () => this.repo.list(input),
      this.redis,
    );

    return orders;
  }

  async getById(id: number): Promise<OrderDetailResponse> {
    const key = CACHE_KEY.getById(id);
    const order = await getCached(
      key,
      config.redis.cache.orders,
      () => this.repo.getById(id),
      this.redis,
    );

    if (!order) throw ERROR.NOT_FOUND;
    return order;
  }

  async create(input: OrderInput): Promise<OrderDetailResponse> {
    const { order, affectedProducts } = await this.repo.create(input);
    if (order === "product_not_found") throw ERROR.PRODUCT_NOT_FOUND;
    if (order === "insufficient_stock") throw ERROR.INSUFFICIENT_STOCK;

    for (let i = 0; i < affectedProducts.length; i++) {
      const p = affectedProducts[i];
      if (p.qty === 0) {
        const redisKey = `product_out_of_stock:${p.productId}`;
        const alreadyNotified = await this.redis.get(redisKey);

        if (!alreadyNotified) {
          wsManager.sendToAdmins("product:out_of_stock", { ...p });
          await this.redis.set(
            redisKey,
            "1",
            "EX",
            config.redis.productNotificationExpiry,
          );
        }
      }

      if (p.qty <= LOW_STOCK_THRESHOLD) {
        const redisKey = `product_low_stock:${p.productId}`;
        const alreadyNotified = await this.redis.get(redisKey);

        if (!alreadyNotified) {
          wsManager.sendToAdmins("product:low_stock", { ...p });
          await this.redis.set(
            redisKey,
            "1",
            "EX",
            config.redis.productNotificationExpiry,
          );
        }
      }
    }

    await Promise.all([
      invalidateCachePattern("orders:*", this.redis),
      invalidateCachePattern("products:*", this.redis),
      wsManager.broadcast("order:created", { ...order }),
      metricsBroadcaster.broadcast(),
    ]);

    return order;
  }

  async updateById(
    id: number,
    input: OrderInput,
  ): Promise<OrderDetailResponse> {
    const res = await this.repo.updateById(id, input);
    if (!res) throw ERROR.NOT_FOUND;
    if (res.order === "product_not_found") throw ERROR.PRODUCT_NOT_FOUND;
    if (res.order === "insufficient_stock") throw ERROR.INSUFFICIENT_STOCK;

    for (let i = 0; i < res.affectedProducts.length; i++) {
      const p = res.affectedProducts[i];
      if (p.qty === 0) {
        const redisKey = `product_out_of_stock:${p.productId}`;
        const alreadyNotified = await this.redis.get(redisKey);

        if (!alreadyNotified) {
          wsManager.sendToAdmins("product:out_of_stock", { ...p });
          await this.redis.set(
            redisKey,
            "1",
            "EX",
            config.redis.productNotificationExpiry,
          );
        }
      }

      if (p.qty <= LOW_STOCK_THRESHOLD) {
        const redisKey = `product_low_stock:${p.productId}`;
        const alreadyNotified = await this.redis.get(redisKey);

        if (!alreadyNotified) {
          wsManager.sendToAdmins("product:low_stock", { ...p });
          await this.redis.set(
            redisKey,
            "1",
            "EX",
            config.redis.productNotificationExpiry,
          );
        }
      }
    }

    await Promise.all([
      invalidateCachePattern("orders:*", this.redis),
      invalidateCachePattern("products:*", this.redis),
      wsManager.broadcast("order:updated", { ...res.order }),
      metricsBroadcaster.broadcast(),
    ]);

    return res.order;
  }

  async deleteById(id: number): Promise<OrderResponse> {
    const res = await this.repo.deleteById(id);
    if (!res) throw ERROR.NOT_FOUND;

    for (let i = 0; i < res.affectedProducts.length; i++) {
      const productId = res.affectedProducts[i];
      await Promise.all([
        this.redis.del(`product_low_stock:${productId}`),
        this.redis.del(`product_out_of_stock:${productId}`),
      ]);
    }

    await Promise.all([
      invalidateCachePattern("orders:*", this.redis),
      invalidateCachePattern("products:*", this.redis),
      wsManager.broadcast("order:deleted", { ...res.order }),
      metricsBroadcaster.broadcast(),
    ]);

    return res.order;
  }
}
