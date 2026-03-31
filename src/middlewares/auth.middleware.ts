import { NextFunction, Request, Response } from 'express';
import { extractBearerToken, verifyAccessToken } from '../shared/utils/jwt.js';
import { AppError } from '../shared/utils/appError.js';

export interface AuthenticatedRequest extends Request {
  user: {
    userId: number;
  };
}

export const authMiddleware = (req: Request, _res: Response, next: NextFunction): void => {
  try {
    const token = extractBearerToken(req.header('authorization'));
    const payload = verifyAccessToken(token);

    if (!Number.isInteger(payload.userId) || payload.userId <= 0) {
      throw new AppError('Invalid token payload', 401);
    }

    (req as AuthenticatedRequest).user = { userId: payload.userId };

    next();
  } catch (error) {
    throw new AppError('Invalid or expired token', 401);
  }
};
