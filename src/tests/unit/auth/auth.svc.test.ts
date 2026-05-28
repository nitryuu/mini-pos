import { config } from "@/config";
import { AppError } from "@/lib/error";
import { IUsersRepository } from "@/repositories/users.repo";
import { AuthService, IAuthService } from "@/services/auth.svc";
import { getRedis, useRedis } from "@/tests/lib/with-redis";
import { RefreshTokenPayload } from "@/types";
import dayjs from "dayjs";
import { sign } from "hono/jwt";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const repo: IUsersRepository = {
  list: vi.fn(),
  getById: vi.fn(),
  getByEmail: vi.fn(),
  create: vi.fn(),
  updateById: vi.fn(),
  deleteById: vi.fn(),
};

const ERROR = {
  INVALID_CREDENTIALS: new AppError("Invalid email or password", 401),
  INVALID_REFRESH_TOKEN: new AppError("Invalid refresh token", 401),
  EXPIRED_REFRESH_TOKEN: new AppError("Refresh token expired", 401),
};

useRedis();

let svc: IAuthService;

beforeAll(() => {
  svc = new AuthService(repo, getRedis());
});

beforeEach(() => {
  vi.resetAllMocks();
});

describe("AuthService", () => {
  describe("refresh", () => {
    it("throws if refresh token is invalid", async () => {
      await expect(svc.refresh("invalid-token")).rejects.toThrow(
        ERROR.INVALID_REFRESH_TOKEN,
      );
    });

    it("throws if token is expired", async () => {
      const token = await sign(
        {
          sub: 1,
          tokenId: "test-token-id",
          exp: dayjs().add(config.jwt.refreshExpiry, "day").unix(),
        } satisfies RefreshTokenPayload,
        config.jwt.refreshSecret,
      );

      await expect(svc.refresh(token)).rejects.toThrow(
        ERROR.EXPIRED_REFRESH_TOKEN,
      );
    });
  });

  describe("login", () => {
    it("throws if user not found", async () => {
      await expect(
        svc.login({ email: "invalid-email", password: "correct-password" }),
      ).rejects.toThrow(ERROR.INVALID_CREDENTIALS);
    });

    it("throws if password is wrong", async () => {
      await expect(
        svc.login({ email: "correct-password", password: "invalid-password" }),
      ).rejects.toThrow(ERROR.INVALID_CREDENTIALS);
    });
  });
});
