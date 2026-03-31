import { NextFunction, Request, Response } from 'express';
import { getAccessTokenPayloadFromHeader } from '../shared/utils/jwt.js';

export interface AuthenticatedRequest extends Request {
  user: {
    userId: number;
  };
}

export const authMiddleware = (req: Request, _res: Response, next: NextFunction): void => {
  const payload = getAccessTokenPayloadFromHeader(req.header('authorization'));
  (req as AuthenticatedRequest).user = { userId: payload.userId };
  next();
};
