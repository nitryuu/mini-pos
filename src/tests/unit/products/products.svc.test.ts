import { IProductsRepository, toResponse } from "@/repositories/products.repo";
import { ERROR, ProductsService } from "@/services/products.svc";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { data } from "./data";
import { getRedis, useRedis } from "@/tests/lib/with-redis";
import { wsManager } from "@/ws/manager";
import { config } from "@/config";

vi.mock("@/ws/manager", () => ({
  wsManager: {
    add: vi.fn(),
    remove: vi.fn(),
    sendToUser: vi.fn(),
    sendToCashiers: vi.fn(),
    sendToAdmins: vi.fn(),
    broadcast: vi.fn(),
  },
}));

const repo: IProductsRepository = {
  list: vi.fn(),
  create: vi.fn(),
  getById: vi.fn(),
  getByBarcode: vi.fn(),
  updateById: vi.fn(),
  deleteById: vi.fn(),
};

useRedis();

let svc: ProductsService;

beforeAll(() => {
  svc = new ProductsService(repo, getRedis());
});

beforeEach(() => {
  vi.resetAllMocks();
});

const formattedData = data.map(({ id, ...rest }) => rest);

describe("ProductsService", () => {
  describe("create", () => {
    it("throws if barcode already in use", async () => {
      vi.mocked(repo.create).mockResolvedValue("barcode_in_use");

      const res = svc.create(formattedData[0]);
      await expect(res).rejects.toThrow(ERROR.BARCODE_IN_USE);
    });

    it("sends product created event", async () => {
      vi.mocked(repo.create).mockResolvedValue(toResponse(data[0]));
      await svc.create(formattedData[0]);

      expect(wsManager.broadcast).toHaveBeenCalledWith(
        "product:created",
        expect.objectContaining(toResponse(data[0])),
      );
    });
  });

  describe("getById", () => {
    it("throws if no products exist", async () => {
      vi.mocked(repo.getById).mockResolvedValue(undefined);

      const res = svc.getById(1);
      await expect(res).rejects.toThrow(ERROR.NOT_FOUND);

      expect(repo.getById).toHaveBeenCalledOnce();
    });
  });

  describe("updateById", () => {
    it("throws if barcode already in use", async () => {
      vi.mocked(repo.updateById).mockResolvedValue("barcode_in_use");

      const res = svc.updateById(1, formattedData[0]);
      await expect(res).rejects.toThrow(ERROR.BARCODE_IN_USE);
    });

    it("throws if no products exist", async () => {
      vi.mocked(repo.updateById).mockResolvedValue(undefined);

      const res = svc.updateById(1, data[0]);
      await expect(res).rejects.toThrow(ERROR.NOT_FOUND);

      expect(repo.updateById).toHaveBeenCalledOnce();
    });

    it("sends product updated event", async () => {
      vi.mocked(repo.updateById).mockResolvedValue(
        toResponse({ ...data[0], oldImage: null }),
      );

      await svc.updateById(1, formattedData[0]);

      expect(wsManager.broadcast).toHaveBeenCalledWith(
        "product:updated",
        expect.objectContaining(toResponse(data[0])),
      );
    });

    it("removes product low stock in redis if qty > threshold", async () => {
      const redis = getRedis();
      const redisKey = `product_low_stock:${data[0].id}`;
      await redis.set(
        redisKey,
        "1",
        "EX",
        config.redis.productNotificationExpiry,
      );

      vi.mocked(repo.updateById).mockResolvedValue(
        toResponse({ ...data[0], oldImage: null }),
      );

      await svc.updateById(1, formattedData[0]);
      await expect(redis.get(redisKey)).resolves.toBeNull();
    });

    it("removes product out of stock in redis if qty > threshold", async () => {
      const redis = getRedis();
      const redisKey = `product_out_of_stock:${data[0].id}`;
      await redis.set(
        redisKey,
        "1",
        "EX",
        config.redis.productNotificationExpiry,
      );

      vi.mocked(repo.updateById).mockResolvedValue(
        toResponse({ ...data[0], oldImage: null }),
      );

      await svc.updateById(1, formattedData[0]);
      await expect(redis.get(redisKey)).resolves.toBeNull();
    });
  });

  describe("deleteById", () => {
    it("throws if no products exist", async () => {
      vi.mocked(repo.deleteById).mockResolvedValue(undefined);

      const res = svc.deleteById(1);
      await expect(res).rejects.toThrow(ERROR.NOT_FOUND);

      expect(repo.deleteById).toHaveBeenCalledOnce();
    });

    it("sends product deleted event", async () => {
      vi.mocked(repo.deleteById).mockResolvedValue(toResponse(data[0]));
      await svc.deleteById(1);

      expect(wsManager.broadcast).toHaveBeenCalledWith(
        "product:deleted",
        expect.objectContaining({ id: 1 }),
      );
    });

    it("removes product low stock in redis if qty > threshold", async () => {
      const redis = getRedis();
      const redisKey = `product_low_stock:${data[0].id}`;
      await redis.set(
        redisKey,
        "1",
        "EX",
        config.redis.productNotificationExpiry,
      );

      vi.mocked(repo.deleteById).mockResolvedValue(
        toResponse({ ...data[0], qty: 5 }),
      );

      await svc.deleteById(1);
      await expect(redis.get(redisKey)).resolves.toBeNull();
    });

    it("removes product out of stock in redis if qty > threshold", async () => {
      const redis = getRedis();
      const redisKey = `product_out_of_stock:${data[0].id}`;
      await redis.set(
        redisKey,
        "1",
        "EX",
        config.redis.productNotificationExpiry,
      );

      vi.mocked(repo.deleteById).mockResolvedValue(toResponse(data[0]));

      await svc.deleteById(1);
      await expect(redis.get(redisKey)).resolves.toBeNull();
    });
  });
});
