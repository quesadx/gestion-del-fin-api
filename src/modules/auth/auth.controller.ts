import { Request, Response } from 'express';
import * as authService from './auth.service.js';
import { getRefreshTokenExpiryMs } from '../../shared/utils/refreshToken.js';

const COOKIE_NAME = 'refreshToken';
const COOKIE_PATH = '/auth';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

function setRefreshCookie(res: Response, token: string): void {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: IS_PRODUCTION ? 'none' : 'lax',
    maxAge: getRefreshTokenExpiryMs(),
    path: COOKIE_PATH,
  });
}

function clearRefreshCookie(res: Response): void {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: IS_PRODUCTION ? 'none' : 'lax',
    path: COOKIE_PATH,
  });
}

export const login = async (req: Request, res: Response) => {
  const result = await authService.login(req.body);
  setRefreshCookie(res, result.refreshToken);
  res.json({
    accessToken: result.accessToken,
    user: result.user,
  });
};

export const refresh = async (req: Request, res: Response) => {
  const refreshTokenCookie = req.cookies?.[COOKIE_NAME];
  const result = await authService.refresh(refreshTokenCookie);
  setRefreshCookie(res, result.refreshToken);
  res.json({
    accessToken: result.accessToken,
  });
};

export const logout = async (req: Request, res: Response) => {
  const refreshTokenCookie = req.cookies?.[COOKIE_NAME];
  const result = await authService.logout(refreshTokenCookie);
  clearRefreshCookie(res);
  res.json(result);
};
