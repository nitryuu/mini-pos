import { config } from "@/config";
import { AppError } from "@/lib/error";
import { IUsersRepository } from "@/repositories/users.repo";
import { LoginInput } from "@/schemas/auth.schema";
import { AccessTokenPayload, RefreshTokenPayload } from "@/types";
import dayjs from "dayjs";
import { sign, verify } from "hono/jwt";
import Redis from "ioredis";

export interface IAuthService {
  refresh(
    refreshToken: string,
  ): Promise<{ accessToken: string; newRefreshToken: string }>;
  login(
    input: LoginInput,
  ): Promise<{ accessToken: string; refreshToken: string }>;
  logout(refreshToken: string): Promise<void>;
}

const ERROR = {
  INVALID_CREDENTIALS: new AppError("Invalid email or password", 401),
  INVALID_REFRESH_TOKEN: new AppError("Invalid refresh token", 401),
  EXPIRED_REFRESH_TOKEN: new AppError("Refresh token expired", 401),
};

const refreshTokenKey = (userId: number, tokenId: string) => {
  return `refresh_token:${userId}:${tokenId}`;
};

export class AuthService implements IAuthService {
  constructor(
    private repo: IUsersRepository,
    private redis: Redis,
  ) { }

  async refresh(
    refreshToken: string,
  ): Promise<{ accessToken: string; newRefreshToken: string }> {
    let payload: RefreshTokenPayload;
    try {
      payload = (await verify(
        refreshToken,
        config.jwt.refreshSecret,
        "HS256",
      )) as RefreshTokenPayload;
    } catch {
      throw ERROR.INVALID_REFRESH_TOKEN;
    }

    const key = refreshTokenKey(payload.sub, payload.tokenId);
    const exists = await this.redis.get(key);
    if (!exists) throw ERROR.EXPIRED_REFRESH_TOKEN;

    const user = await this.repo.getById(payload.sub);
    if (!user) throw ERROR.INVALID_REFRESH_TOKEN;

    await this.redis.del(key);

    const tokenId = crypto.randomUUID();
    const newRefreshToken = await sign(
      {
        sub: user.id,
        tokenId,
        exp: dayjs().add(config.jwt.refreshExpiry, "day").unix(),
      } satisfies RefreshTokenPayload,
      config.jwt.refreshSecret,
    );

    await this.redis.set(
      refreshTokenKey(user.id, tokenId),
      "valid",
      "EX",
      config.redis.refrehsExpiry,
    );

    const accessToken = await sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        exp: dayjs().add(config.jwt.accessExpiry, "minute").unix(),
      } satisfies AccessTokenPayload,
      config.jwt.accessSecret,
    );

    return { accessToken, newRefreshToken };
  }

  async login(
    input: LoginInput,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const user = await this.repo.getByEmail(input.email);
    if (!user) throw ERROR.INVALID_CREDENTIALS;

    const valid = await Bun.password.verify(input.password, user.password);
    if (!valid) throw ERROR.INVALID_CREDENTIALS;

    const tokenId = crypto.randomUUID();

    const refreshToken = await sign(
      {
        sub: user.id,
        tokenId,
        exp: dayjs().add(config.jwt.refreshExpiry, "day").unix(),
      } satisfies RefreshTokenPayload,
      config.jwt.refreshSecret,
    );

    const accessToken = await sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        exp: dayjs().add(config.jwt.accessExpiry, "minute").unix(),
      } satisfies AccessTokenPayload,
      config.jwt.accessSecret,
    );

    await this.redis.set(
      refreshTokenKey(user.id, tokenId),
      "valid",
      "EX",
      config.redis.refrehsExpiry,
    );

    return { accessToken, refreshToken };
  }

  async logout(refreshToken: string): Promise<void> {
    try {
      const payload = (await verify(
        refreshToken,
        config.jwt.refreshSecret,
        "HS256",
      )) as RefreshTokenPayload;

      await this.redis.del(refreshTokenKey(payload.sub, payload.tokenId));
    } catch {
      // NOTE: IGNORE
    }
  }
}
