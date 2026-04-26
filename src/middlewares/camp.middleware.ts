import { NextFunction, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../shared/utils/appError.js';
import { AuthenticatedRequest } from './auth.middleware.js';

export const campMiddleware = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const campId = authReq.user?.campId;

    if (!campId) {
      throw new AppError('Unauthorized', 401);
    }

    const camp = await prisma.camps.findUnique({
      where: { id: campId },
      select: { id: true, status: true },
    });

    if (!camp || camp.status !== 'ACTIVE') {
      throw new AppError('Unauthorized', 401);
    }

    const requestedCampParam = req.params.campId;
    if (requestedCampParam !== undefined) {
      const requestedCampId = Number(requestedCampParam);
      if (
        !Number.isInteger(requestedCampId) ||
        requestedCampId <= 0 ||
        requestedCampId !== campId
      ) {
        throw new AppError('Unauthorized', 401);
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};
