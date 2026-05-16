import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware.js';
import { AppError } from '../../shared/utils/appError.js';
import * as authService from './auth.service.js';

export const login = async (req: Request, res: Response) => {
  const result = await authService.login(req.body);
  res.json(result);
};

export const logout = async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const userId = authReq.user?.userId;
  if (!userId) {
    throw new AppError('Unauthorized', 401);
  }
  const result = await authService.logout(userId);
  res.json(result);
};
