import {
  IProductsRepository,
  ProductsRepository,
} from "@/repositories/products.repo";
import { getDb, useDb } from "@/tests/lib/with-db";
import { beforeAll, describe, expect, it } from "vitest";
import { data } from "./data";
import { ProductResponse } from "@/models";

useDb();

let repo: IProductsRepository;

beforeAll(() => {
  repo = new ProductsRepository(getDb());
});

const formattedData = data.map(({ id, ...rest }) => rest);

describe("ProductsRepository", () => {
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

      const res = await repo.list({ search: "Product A" });
      expect(res.data).toHaveLength(1);
    });
  });

  describe("create", () => {
    it("returns the created user data", async () => {
      const res = (await repo.create(formattedData[0])) as ProductResponse;
      expect(res.name).toBe(formattedData[0].name);
      expect(res.price).toBe(+formattedData[0].price);
    });
  });

  describe("getById", () => {
    it("returns the user data", async () => {
      const res = (await repo.create(formattedData[0])) as ProductResponse;

      const user = (await repo.getById(res.id)) as ProductResponse;
      expect(user?.name).toBe(formattedData[0].name);
      expect(user?.price).toBe(+formattedData[0].price);
    });

    it("returns undefined if no users exist", async () => {
      const res = await repo.getById(1);
      expect(res).toBeUndefined();
    });
  });

  describe("getByBarcode", () => {
    it("returns the user data", async () => {
      const res = (await repo.create(formattedData[0])) as ProductResponse;

      const user = await repo.getByBarcode(res.barcode!);
      expect(user?.name).toBe(formattedData[0].name);
      expect(user?.price).toBe(+formattedData[0].price);
    });

    it("returns undefined if no users exist", async () => {
      const res = await repo.getByBarcode("aa");
      expect(res).toBeUndefined();
    });
  });

  describe("updateById", () => {
    it("returns the updated data", async () => {
      const createRes = (await repo.create(
        formattedData[0],
      )) as ProductResponse;
      const res = (await repo.updateById(
        createRes.id,
        formattedData[1],
      )) as ProductResponse;
      expect(res?.name).toBe("Product B");
      expect(res?.price).toBe(4000.0);
    });

    it("returns undefined if no products exist", async () => {
      const res = await repo.updateById(1, formattedData[1]);
      expect(res).toBeUndefined();
    });
  });

  describe("deleteById", () => {
    it("returns the deleted data", async () => {
      const createRes = (await repo.create(
        formattedData[0],
      )) as ProductResponse;
      const res = await repo.deleteById(createRes.id);
      expect(res?.name).toBe("Product A");
      expect(res?.price).toBe(1000.0);
    });

    it("returns undefined if no products exist", async () => {
      const res = await repo.updateById(1, formattedData[1]);
      expect(res).toBeUndefined();
    });
  });
});
