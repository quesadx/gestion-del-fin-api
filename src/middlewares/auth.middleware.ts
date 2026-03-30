import { NextFunction, Request, Response } from 'express';
import { JwtPayload } from 'jsonwebtoken';
import { verifyToken } from '../shared/utils/jwt.js';
import { AppError } from '../shared/utils/appError.js';

export interface AuthenticatedRequest extends Request {
  user: {
    userId: number;
  };
}

const getBearerToken = (authorizationHeader?: string): string => {
  if (!authorizationHeader) {
    throw new AppError('Missing Authorization header', 401);
  }

  const [scheme, token, ...rest] = authorizationHeader.trim().split(' ');

  if (scheme !== 'Bearer' || !token || rest.length > 0) {
    throw new AppError('Invalid Authorization header format. Expected: Bearer <token>', 401);
  }

  return token;
};

const getUserIdFromPayload = (decodedToken: string | JwtPayload): number => {
  if (typeof decodedToken === 'string') {
    throw new AppError('Invalid token payload', 401);
  }

  const userId = decodedToken.userId;

  if (typeof userId !== 'number' || !Number.isInteger(userId) || userId <= 0) {
    throw new AppError('Invalid token payload', 401);
  }

  return userId;
};

export const authMiddleware = (req: Request, _res: Response, next: NextFunction): void => {
  try {
    const token = getBearerToken(req.header('authorization'));
    const decodedToken = verifyToken(token);
    const userId = getUserIdFromPayload(decodedToken);

    (req as AuthenticatedRequest).user = { userId };

    next();
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError('Invalid or expired token', 401);
  }
};
