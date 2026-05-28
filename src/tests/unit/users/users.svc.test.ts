import { IUsersRepository } from "@/repositories/users.repo";
import { ERROR, UsersService } from "@/services/users.svc";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { data } from "./data";
import { getRedis } from "@/tests/lib/with-redis";

const repo: IUsersRepository = {
  list: vi.fn(),
  getById: vi.fn(),
  getByEmail: vi.fn(),
  create: vi.fn(),
  updateById: vi.fn(),
  deleteById: vi.fn(),
};

const svc = new UsersService(repo, getRedis());

beforeEach(() => {
  vi.resetAllMocks();
});

describe("UsersService", () => {
  describe("register", () => {
    it("throws if email already in use", async () => {
      const hashed = await Bun.password.hash(data[0].password);
      vi.mocked(repo.create).mockResolvedValue("email_in_use");
      const res = svc.register({
        ...data[0],
        password: hashed,
      });

      await expect(res).rejects.toThrow(ERROR.EMAIL_IN_USE);
    });
  });

  describe("updateById", () => {
    it("throws if no users exist", async () => {
      vi.mocked(repo.updateById).mockResolvedValue(undefined);

      const hashed = await Bun.password.hash("admin");
      const res = svc.updateById(
        1,
        { ...data[0], password: hashed },
        "valid-token",
      );

      await expect(res).rejects.toThrow(ERROR.NOT_FOUND);
    });
  });

  describe("deleteById", () => {
    it("throws if no users exist", async () => {
      vi.mocked(repo.deleteById).mockResolvedValue(undefined);

      const res = svc.deleteById(1, 2, "valid-token");
      await expect(res).rejects.toThrow(ERROR.NOT_FOUND);
    });
  });
});
