// Controllers only deal with HTTP (req/res). Business logic lives in services.
import { CookieOptions, Request, Response } from 'express';
import authService from '../services/auth.service';
import { verifyRefreshToken } from '../utils/tokens';
import { currentUser } from '../middleware/auth';
import env from '../config/env';
import type { LoginInput } from '../validators/auth.validator';

const REFRESH_COOKIE = 'refreshToken';

const cookieOptions: CookieOptions = {
  httpOnly: true, // JavaScript in the browser can't read it (XSS protection)
  secure: env.isProduction, // HTTPS only in production
  sameSite: 'strict', // not sent on cross-site requests (CSRF protection)
  path: '/api/auth', // only sent to auth routes
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

export async function login(req: Request, res: Response) {
  const { email, password } = req.body as LoginInput;
  const { user, accessToken, refreshToken } = await authService.login(email, password);
  res.cookie(REFRESH_COOKIE, refreshToken, cookieOptions);
  res.json({ data: { user, accessToken } });
}

export async function refresh(req: Request, res: Response) {
  const { user, accessToken, refreshToken } = await authService.refresh(req.cookies[REFRESH_COOKIE]);
  res.cookie(REFRESH_COOKIE, refreshToken, cookieOptions);
  res.json({ data: { user, accessToken } });
}

export async function logout(req: Request, res: Response) {
  // Logout works from the cookie alone, so it still works after the
  // access token has expired.
  const token: string | undefined = req.cookies[REFRESH_COOKIE];
  if (token) {
    try {
      await authService.logout(verifyRefreshToken(token).sub);
    } catch {
      // token already invalid - nothing to revoke
    }
  }
  const { maxAge, ...clearOptions } = cookieOptions;
  res.clearCookie(REFRESH_COOKIE, clearOptions);
  res.status(204).end();
}

export async function me(req: Request, res: Response) {
  res.json({ data: await authService.getMe(currentUser(req).id) });
}
