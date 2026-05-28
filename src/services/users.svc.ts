import { config } from "@/config";
import { AppError } from "@/lib/error";
import { User } from "@/models";
import { IUsersRepository } from "@/repositories/users.repo";
import { UserInput, UserResponse } from "@/schemas/user.schema";
import { AccessTokenPayload } from "@/types";
import dayjs from "dayjs";
import { verify } from "hono/jwt";
import Redis from "ioredis";

export interface IUsersService {
  register(input: UserInput): Promise<UserResponse>;
  updateById(id: number, input: UserInput, userToken: string): Promise<User>;
  deleteById(id: number, userId: number, userToken: string): Promise<User>;
}

export const ERROR = {
  NOT_FOUND: new AppError("User not found", 404),
  EMAIL_IN_USE: new AppError("Email already in use", 409),
  SELF_DELETION: new AppError("You cannot delete your own account", 400),
  LAST_ADMIN: new AppError("Cannot delete the last admin account", 400),
};

export class UsersService implements IUsersService {
  constructor(
    private repo: IUsersRepository,
    private redis: Redis,
  ) { }

  async register(input: UserInput): Promise<UserResponse> {
    const hashed = await Bun.password.hash(input.password);
    const user = await this.repo.create({ ...input, password: hashed });
    if (user === "email_in_use") throw ERROR.EMAIL_IN_USE;
    return user;
  }

  async updateById(
    id: number,
    input: UserInput,
    accessToken: string,
  ): Promise<User> {
    const user = await this.repo.updateById(id, input);
    if (!user) throw ERROR.NOT_FOUND;
    if (user === "email_in_use") throw ERROR.EMAIL_IN_USE;

    const passwordChanged = await Bun.password.verify(
      input.password,
      user.password,
    );

    const invalidatesToken =
      passwordChanged || input.role !== user.role || input.email !== user.email;

    if (invalidatesToken) {
      const keys = await this.redis.keys(`refresh_token:${id}:*`);
      if (keys.length > 0) await this.redis.del(...keys);

      const payload = (await verify(
        accessToken,
        config.jwt.accessSecret,
        "HS256",
      )) as AccessTokenPayload;

      const ttl = payload.exp - dayjs().unix();
      if (ttl > 0)
        await this.redis.set(`blacklist:${accessToken}`, "1", "EX", ttl);
    }

    return user;
  }

  async deleteById(
    id: number,
    userId: number,
    userToken: string,
  ): Promise<User> {
    const user = await this.repo.deleteById(id, userId);
    if (!user) throw ERROR.NOT_FOUND;
    if (user === "self_deletion") throw ERROR.SELF_DELETION;
    if (user === "last_admin") throw ERROR.LAST_ADMIN;

    const keys = await this.redis.keys(`refresh_token:${id}:*`);
    if (keys.length > 0) await this.redis.del(...keys);

    const payload = (await verify(
      userToken,
      config.jwt.accessSecret,
      "HS256",
    )) as AccessTokenPayload;

    const ttl = payload.exp - dayjs().unix();
    if (ttl > 0) await this.redis.set(`blacklist:${userToken}`, "1", "EX", ttl);

    return user;
  }
}
