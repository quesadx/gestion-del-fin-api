import { NextFunction, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../shared/utils/appError.js';
import { AuthenticatedRequest } from './auth.middleware.js';

function normalizePermissions(required: string | string[]): string[] {
  return Array.isArray(required) ? required : [required];
}

export const permissionMiddleware = (required: string | string[]) => {
  const requiredPermissions = normalizePermissions(required);

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
          roles: {
            select: {
              role_permissions: {
                select: { permissions: { select: { name: true } } },
              },
            },
          },
        },
      });

      if (!user || !user.is_active || user.camp_id !== authUser.campId) {
        throw new AppError('Forbidden', 403);
      }

      const permissionNames = new Set(
        user.roles.role_permissions.map((item) => item.permissions.name),
      );

      const missingPermissions = requiredPermissions.filter(
        (permission) => !permissionNames.has(permission),
      );

      if (missingPermissions.length > 0) {
        throw new AppError('Forbidden', 403);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
