import {
  BuyersRepository,
  IBuyersRepository,
} from "@/repositories/buyers.repo";
import { getDb, useDb } from "@/tests/lib/with-db";
import { beforeAll, describe, expect, it } from "vitest";
import { data } from "./data";

useDb();

let repo: IBuyersRepository;

beforeAll(() => {
  repo = new BuyersRepository(getDb());
});

const formattedData = data.map(({ id, ...rest }) => rest);

describe("BuyersRepository", () => {
  describe("list", () => {
    it("returns empty array when no buyers exist", async () => {
      const res = await repo.list({});
      expect(res.data).toEqual([]);
      expect(res.nextCursor).toBeNull();
    });

    it("returns all buyers", async () => {
      await Promise.all([
        repo.create(formattedData[0]),
        repo.create(formattedData[1]),
      ]);

      const res = await repo.list({});
      expect(res.data).toHaveLength(2);
    });

    it("paginates correctly", async () => {
      await Promise.all([
        repo.create(formattedData[0]),
        repo.create(formattedData[1]),
      ]);

      const first = await repo.list({ limit: 1 });
      expect(first.data).toHaveLength(1);
      expect(first.nextCursor).not.toBeNull();

      const second = await repo.list({ limit: 1, cursor: first.nextCursor });
      expect(second.data).toHaveLength(1);
      expect(second.nextCursor).toBeNull();
    });

    it("returns searched buyers", async () => {
      await Promise.all([
        repo.create(formattedData[0]),
        repo.create(formattedData[1]),
      ]);

      const res = await repo.list({ search: formattedData[0].name });
      expect(res.data).toHaveLength(1);
    });
  });

  describe("getById", () => {
    it("returns undefined if no buyers exist", async () => {
      const res = await repo.getById(1);
      expect(res).toBeUndefined();
    });

    it("returns buyer data", async () => {
      const buyer = await repo.create(formattedData[0]);
      const res = await repo.getById(buyer.id);
      expect(res?.name).toBe("John");
    });
  });

  describe("updateById", () => {
    it("returns undefined if no buyers exist", async () => {
      const res = await repo.updateById(1, formattedData[1]);
      expect(res).toBeUndefined();
    });

    it("returns the updated buyer data", async () => {
      const buyer = await repo.create(formattedData[0]);
      const res = await repo.updateById(buyer.id, formattedData[1]);
      expect(res?.name).toBe(formattedData[1].name);
      expect(res?.note).toBeNull();
    });
  });

  describe("create", () => {
    it("returns the created buyer data", async () => {
      const res = await repo.create(formattedData[0]);
      expect(res.name).toBe(formattedData[0].name);
      expect(res.note).toBe(formattedData[0].note);
    });
  });

  describe("deleteById", () => {
    it("returns undefined if no buyers exist", async () => {
      const res = await repo.deleteById(1);
      expect(res).toBeUndefined();
    });

    it("returns the deleted buyer data", async () => {
      const buyer = await repo.create(formattedData[0]);
      const res = await repo.deleteById(buyer.id);
      expect(res).not.toBeUndefined();
      expect(res?.name).toBe(formattedData[0].name);
      expect(res?.note).toBe(formattedData[0].note);

      const exists = await repo.getById(buyer.id);
      expect(exists).toBeUndefined();
    });
  });
});
