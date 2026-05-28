import {
  IOrdersRepository,
  OrdersRepository,
} from "@/repositories/orders.repo";
import { getDb, useDb } from "@/tests/lib/with-db";
import { beforeAll, describe, expect, it } from "vitest";
import { createData } from "./data";
import { ProductsRepository } from "@/repositories/products.repo";
import { data as productData } from "../products/data";
import { ProductResponse } from "@/models/product.model";
import { OrderDetailResponse } from "@/schemas/order.schema";
import { OrderResponse } from "@/models";

useDb();

let repo: IOrdersRepository;

beforeAll(() => {
  repo = new OrdersRepository(getDb());
});

const addProducts = async () => {
  const productRepo = new ProductsRepository(getDb());
  const createData = productData.map(({ id, ...rest }) => rest);
  return Promise.all([
    productRepo.create(createData[0]) as Promise<ProductResponse>,
    productRepo.create(createData[1]) as Promise<ProductResponse>,
  ]);
};

describe("OrdersRepository", () => {
  describe("list", () => {
    it("returns empty array when no orders exist", async () => {
      const res = await repo.list({});
      expect(res.data).toEqual([]);
      expect(res.nextCursor).toBeNull();
    });

    it("returns all orders", async () => {
      const allProducts = await addProducts();
      await Promise.all([
        repo.create({
          ...createData[0],
          items: createData[0].items.map((item, i) => ({
            ...item,
            productId: allProducts[i].id,
          })),
        }),
        repo.create({
          ...createData[1],
          items: createData[1].items.map((item, i) => ({
            ...item,
            productId: allProducts[i].id,
          })),
        }),
      ]);

      const res = await repo.list({});
      expect(res.data).toHaveLength(2);
    });

    it("paginates correctly", async () => {
      const allProducts = await addProducts();
      await Promise.all([
        repo.create({
          ...createData[0],
          items: createData[0].items.map((item, i) => ({
            ...item,
            productId: allProducts[i].id,
          })),
        }),
        repo.create({
          ...createData[1],
          items: createData[1].items.map((item, i) => ({
            ...item,
            productId: allProducts[i].id,
          })),
        }),
      ]);

      const first = await repo.list({ limit: 1 });
      expect(first.data).toHaveLength(1);
      expect(first.nextCursor).not.toBeNull();

      const second = await repo.list({ limit: 1, cursor: first.nextCursor });
      expect(second.data).toHaveLength(1);
      expect(second.nextCursor).toBeNull();
    });

    it("returns searched orders", async () => {
      const allProducts = await addProducts();
      await Promise.all([
        repo.create({
          ...createData[0],
          items: createData[0].items.map((item, i) => ({
            ...item,
            productId: allProducts[i].id,
          })),
        }),
        repo.create({
          ...createData[1],
          items: createData[1].items.map((item, i) => ({
            ...item,
            productId: allProducts[i].id,
          })),
        }),
      ]);

      const res = await repo.list({ date: createData[0].date });
      expect(res.data).toHaveLength(1);
    });
  });

  describe("getById", () => {
    it("returns undefined if no orders exist", async () => {
      const res = await repo.getById(1);
      expect(res).toBeUndefined();
    });

    it("returns order data", async () => {
      const allProducts = await addProducts();
      const { order } = (await repo.create({
        ...createData[0],
        items: createData[0].items.map((item, i) => ({
          ...item,
          productId: allProducts[i].id,
        })),
      })) as { order: OrderDetailResponse };

      const res = await repo.getById(order.id);
      expect(res?.total).toBe(20000);
    });
  });

  describe("create", () => {
    it("returns the created order data", async () => {
      const allProducts = await addProducts();
      const { order } = (await repo.create({
        ...createData[0],
        items: createData[0].items.map((item, i) => ({
          ...item,
          productId: allProducts[i].id,
        })),
      })) as { order: OrderDetailResponse };

      expect(order.total).toBe(20000);
      expect(order.buyerId).toBeNull();
    });
  });

  describe("updateById", () => {
    it("returns undefined if no orders exist", async () => {
      const allProducts = await addProducts();
      const res = await repo.updateById(1, {
        ...createData[0],
        items: createData[0].items.map((item, i) => ({
          ...item,
          productId: allProducts[i].id,
        })),
      });
      expect(res).toBeUndefined();
    });

    it("returns the updated order data", async () => {
      const allProducts = await addProducts();
      const { order } = (await repo.create({
        ...createData[0],
        items: createData[0].items.map((item, i) => ({
          ...item,
          productId: allProducts[i].id,
        })),
      })) as { order: OrderDetailResponse };

      const { order: updatedOrder } = (await repo.updateById(order.id, {
        ...createData[1],
        items: createData[1].items.map((item, i) => ({
          ...item,
          productId: allProducts[i].id,
        })),
      })) as { order: OrderDetailResponse };

      expect(updatedOrder?.total).toBe(6000);
      expect(updatedOrder?.buyerId).toBeNull();
    });
  });

  describe("deleteById", () => {
    it("returns undefined if no orders exist", async () => {
      const res = await repo.deleteById(1);
      expect(res).toBeUndefined();
    });

    it("returns the deleted buyer data", async () => {
      const allProducts = await addProducts();
      const { order } = (await repo.create({
        ...createData[0],
        items: createData[0].items.map((item, i) => ({
          ...item,
          productId: allProducts[i].id,
        })),
      })) as { order: OrderDetailResponse };

      const res = (await repo.deleteById(order.id)) as { order: OrderResponse };
      expect(res).not.toBeUndefined();
      expect(res.order.total).toBe(20000);
      expect(res.order.buyerId).toBeNull();

      const exists = await repo.getById(order.id);
      expect(exists).toBeUndefined();
    });
  });
});
