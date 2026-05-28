import { JWTPayload } from "hono/utils/jwt/types";

export type AccessTokenPayload = JWTPayload & {
  sub: number;
  email: string;
  role: "admin" | "cashier";
  exp: number;
};

export type RefreshTokenPayload = JWTPayload & {
  sub: number;
  tokenId: string;
  exp: number;
};

declare module "hono" {
  interface ContextVariableMap {
    user: AccessTokenPayload;
  }
}
