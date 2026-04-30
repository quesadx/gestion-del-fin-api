import { NextFunction, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../shared/utils/appError.js';
import { isRoleName, RoleName } from '../shared/constants/roles.js';
import { AuthenticatedRequest } from './auth.middleware.js';

export const roleMiddleware = (allowedRoles: RoleName[]) => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const authUser = authReq.user;

      if (!authUser?.userId || !authUser?.campId) {
        throw new AppError('Unauthorized', 401);
      }

      const user = await prisma.users.findUnique({
        where: { id: authUser.userId },
        select: {
          id: true,
          camp_id: true,
          is_active: true,
          roles: { select: { name: true } },
        },
      });

      if (!user || !user.is_active || user.camp_id !== authUser.campId) {
        throw new AppError('Unauthorized', 401);
      }

      const dbRole = user.roles.name;
      if (!isRoleName(dbRole)) {
        throw new AppError('Unauthorized', 401);
      }

      if (!allowedRoles.includes(dbRole)) {
        throw new AppError('Unauthorized', 401);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
