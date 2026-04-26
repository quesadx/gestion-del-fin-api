import { Request, Response } from 'express';
import * as authService from './auth.service.js';

export const login = async (req: Request, res: Response) => {
  const result = await authService.login(req.body);
  res.json(result);
};
