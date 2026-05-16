import { NextFunction, Request, Response } from 'express';
import { getAccessTokenPayloadFromHeader } from '../shared/utils/jwt.js';

export interface AuthenticatedRequest extends Request {
  user: {
    userId: number;
    campId: number;
    role: string;
    sessionVersion: number;
    isAdmin: boolean;
  };
}

export const authMiddleware = (req: Request, _res: Response, next: NextFunction): void => {
  try {
    const payload = getAccessTokenPayloadFromHeader(req.header('authorization'));
    (req as AuthenticatedRequest).user = {
      userId: payload.userId,
      campId: payload.campId,
      role: payload.role,
      sessionVersion: payload.sessionVersion,
      isAdmin: payload.isAdmin,
    };
    next();
  } catch (error) {
    next(error);
  }
};
