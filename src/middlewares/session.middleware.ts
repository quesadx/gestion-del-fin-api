import { NextFunction, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../shared/utils/appError.js';
import { AuthenticatedRequest } from './auth.middleware.js';

const INACTIVITY_TIMEOUT_MS = 20 * 60 * 1000;

export const sessionMiddleware = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?.userId;

    if (!userId) {
      throw new AppError('Unauthorized', 401);
    }

    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: { id: true, is_active: true, last_activity: true, session_version: true },
    });

    if (!user || !user.is_active) {
      throw new AppError('Unauthorized', 401);
    }

    if (user.session_version !== authReq.user.sessionVersion) {
      throw new AppError('Session terminated', 401);
    }

    if (!user.last_activity) {
      throw new AppError('Session terminated', 401);
    }

    const now = new Date();
    const inactiveForMs = now.getTime() - user.last_activity.getTime();
    if (inactiveForMs > INACTIVITY_TIMEOUT_MS) {
      throw new AppError('Session expired', 401);
    }

    const updateResult = await prisma.users.updateMany({
      where: { id: userId, session_version: authReq.user.sessionVersion },
      data: { last_activity: now },
    });

    if (updateResult.count === 0) {
      throw new AppError('Session terminated', 401);
    }

    next();
  } catch (error) {
    next(error);
  }
};
