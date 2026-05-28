import { config } from "@/config";
import { AppError } from "@/lib/error";
import { loginSchema } from "@/schemas/auth.schema";
import { IAuthService } from "@/services/auth.svc";
import { zValidator } from "@hono/zod-validator";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { createFactory } from "hono/factory";

const ERROR = {
  REFRESH_TOKEN_REQUIRED: new AppError("Refresh token is required"),
};

const factory = createFactory();

export function createAuthController(svc: IAuthService) {
  const refresh = factory.createHandlers(async (c) => {
    const refreshToken = getCookie(c, config.cookie.refreshToken.name);
    if (!refreshToken) throw ERROR.REFRESH_TOKEN_REQUIRED;
    const { accessToken, newRefreshToken } = await svc.refresh(refreshToken);

    setCookie(
      c,
      config.cookie.refreshToken.name,
      newRefreshToken,
      config.cookie.refreshToken,
    );

    return c.json({ success: true, data: { accessToken } });
  });

  const login = factory.createHandlers(
    zValidator("json", loginSchema),
    async (c) => {
      const body = c.req.valid("json");
      const { accessToken, refreshToken } = await svc.login(body);

      setCookie(
        c,
        config.cookie.refreshToken.name,
        refreshToken,
        config.cookie.refreshToken,
      );

      return c.json({ success: true, data: { accessToken } });
    },
  );

  const logout = factory.createHandlers(async (c) => {
    const refreshToken = getCookie(c, config.cookie.refreshToken.name);
    if (refreshToken) svc.logout(refreshToken);
    deleteCookie(c, config.cookie.refreshToken.name);

    return c.json({ success: true });
  });

  return { refresh, login, logout };
}
