import { IBuyersRepository } from "@/repositories/buyers.repo";
import { BuyersService, ERROR } from "@/services/buyers.svc";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { data } from "./data";
import { getRedis, useRedis } from "@/tests/lib/with-redis";

const repo: IBuyersRepository = {
  list: vi.fn(),
  getById: vi.fn(),
  updateById: vi.fn(),
  create: vi.fn(),
  deleteById: vi.fn(),
};

useRedis();

let svc: BuyersService;

beforeAll(() => {
  svc = new BuyersService(repo, getRedis());
});

beforeEach(() => {
  vi.resetAllMocks();
});

const formattedData = data.map(({ id, ...rest }) => rest);

describe("BuyersService", () => {
  describe("getById", () => {
    it("throws if no buyers exist", async () => {
      vi.mocked(repo.getById).mockResolvedValue(undefined);

      const res = svc.getById(1);
      await expect(res).rejects.toThrow(ERROR.NOT_FOUND);

      expect(repo.getById).toHaveBeenCalledOnce();
    });
  });

  describe("updateById", () => {
    it("throws if no buyers exist", async () => {
      vi.mocked(repo.updateById).mockResolvedValue(undefined);

      const res = svc.updateById(1, formattedData[0]);
      await expect(res).rejects.toThrow(ERROR.NOT_FOUND);

      expect(repo.updateById).toHaveBeenCalledOnce();
    });
  });

  describe("deleteById", () => {
    it("throws if no buyers exist", async () => {
      vi.mocked(repo.deleteById).mockResolvedValue(undefined);

      const res = svc.deleteById(1);
      await expect(res).rejects.toThrow(ERROR.NOT_FOUND);

      expect(repo.deleteById).toHaveBeenCalledOnce();
    });
  });
});
