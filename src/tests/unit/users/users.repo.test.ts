import { IUsersRepository, UsersRepository } from "@/repositories/users.repo";
import { getDb, useDb } from "@/tests/lib/with-db";
import { beforeAll, describe, expect, it } from "vitest";
import { data } from "./data";
import { UserResponse } from "@/schemas/user.schema";

useDb();

let repo: IUsersRepository;

beforeAll(() => {
  repo = new UsersRepository(getDb());
});

const formattedData = data.map(({ id, ...rest }) => rest);

describe("UsersRepository", () => {
  describe("list", () => {
    it("returns empty array when no users exist", async () => {
      const res = await repo.list({});
      expect(res.data).toEqual([]);
      expect(res.nextCursor).toBeNull();
    });

    it("returns all users", async () => {
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

    it("returns searched users", async () => {
      await Promise.all([
        repo.create(formattedData[0]),
        repo.create(formattedData[1]),
      ]);

      const res = await repo.list({ search: formattedData[0].name });
      expect(res.data).toHaveLength(1);
    });
  });

  describe("getById", () => {
    it("returns undefined if no users exist", async () => {
      const res = await repo.getById(1);
      expect(res).toBeUndefined();
    });

    it("returns user data", async () => {
      const user = (await repo.create(formattedData[0])) as UserResponse;
      const res = await repo.getById(user.id);
      expect(res?.name).toBe(formattedData[0].name);
    });
  });

  describe("getByEmail", () => {
    it("returns undefined if no users exist", async () => {
      const res = await repo.getByEmail("notexist@email.com");
      expect(res).toBeUndefined();
    });

    it("returns user data", async () => {
      await repo.create(formattedData[0]);
      const res = await repo.getByEmail("john@email.com");
      expect(res?.name).toBe("John");
    });
  });

  describe("updateById", () => {
    it("returns undefined if no users exist", async () => {
      const res = await repo.updateById(1, formattedData[1]);
      expect(res).toBeUndefined();
    });

    it("returns the updated user data", async () => {
      const user = (await repo.create(formattedData[0])) as UserResponse;
      const res = (await repo.updateById(
        user.id,
        formattedData[1],
      )) as UserResponse;

      expect(res?.name).toBe(formattedData[1].name);
      expect(res?.email).toBe(formattedData[1].email);
    });
  });

  describe("create", () => {
    it("returns the created user data", async () => {
      const res = (await repo.create(formattedData[0])) as UserResponse;
      expect(res.name).toBe(formattedData[0].name);
      expect(res.email).toBe(formattedData[0].email);
    });
  });

  describe("deleteById", () => {
    it("returns undefined if no users exist", async () => {
      const res = await repo.deleteById(1, 2);
      expect(res).toBeUndefined();
    });

    it("returns the deleted user data", async () => {
      const user = (await repo.create(formattedData[0])) as UserResponse;

      const res = (await repo.deleteById(user.id, 999)) as UserResponse;
      expect(res).not.toBeUndefined();
      expect(res?.name).toBe(formattedData[0].name);
      expect(res?.email).toBe(formattedData[0].email);

      const exists = await repo.getById(user.id);
      expect(exists).toBeUndefined();
    });
  });
});
