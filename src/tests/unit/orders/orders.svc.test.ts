import { IOrdersRepository } from "@/repositories/orders.repo";
import { ERROR, OrdersService } from "@/services/orders.svc";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createData } from "./data";
import { getRedis, useRedis } from "@/tests/lib/with-redis";

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

const repo: IOrdersRepository = {
  list: vi.fn(),
  getById: vi.fn(),
  create: vi.fn(),
  updateById: vi.fn(),
  deleteById: vi.fn(),
};

useRedis();

let svc = new OrdersService(repo, getRedis());

beforeAll(() => {
  svc = new OrdersService(repo, getRedis());
});

beforeEach(() => {
  vi.resetAllMocks();
});

describe("OrdersService", () => {
  describe("getById", () => {
    it("throws if no orders exist", async () => {
      vi.mocked(repo.getById).mockResolvedValue(undefined);

      const res = svc.getById(1);
      await expect(res).rejects.toThrow(ERROR.NOT_FOUND);

      expect(repo.getById).toHaveBeenCalledOnce();
    });
  });

  describe("updateById", () => {
    it("throws if no orders exist", async () => {
      vi.mocked(repo.updateById).mockResolvedValue(undefined);

      const res = svc.updateById(1, createData[0]);
      await expect(res).rejects.toThrow(ERROR.NOT_FOUND);

      expect(repo.updateById).toHaveBeenCalledOnce();
    });
  });

  describe("deleteById", () => {
    it("throws if no orders exist", async () => {
      vi.mocked(repo.deleteById).mockResolvedValue(undefined);

      const res = svc.deleteById(1);
      await expect(res).rejects.toThrow(ERROR.NOT_FOUND);

      expect(repo.deleteById).toHaveBeenCalledOnce();
    });
  });
});
