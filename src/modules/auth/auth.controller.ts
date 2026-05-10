import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware.js';
import * as authService from './auth.service.js';

export const login = async (req: Request, res: Response) => {
  const result = await authService.login(req.body);
  res.json(result);
};

export const logout = async (req: Request, res: Response) => {
  const userId = (req as AuthenticatedRequest).user.userId;
  const result = await authService.logout(userId);
  res.json(result);
};
