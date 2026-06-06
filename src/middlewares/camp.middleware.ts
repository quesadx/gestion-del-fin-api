import { NextFunction, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../shared/utils/appError.js';
import { AuthenticatedRequest } from './auth.middleware.js';
import { PERMISSIONS } from '../shared/constants/permissions.js';

/**
 * Checks the database on every request to determine if the user has the
 * admin.bypass_camp_scoping permission. This ensures that role changes
 * take effect immediately without requiring a re-login.
 */
async function hasAdminBypass(userId: number): Promise<boolean> {
  const user = await prisma.users.findUnique({
    where: { id: userId },
    select: {
      roles: {
        select: {
          role_permissions: {
            select: { permissions: { select: { name: true } } },
          },
        },
      },
    },
  });

  return (
    user?.roles?.role_permissions?.some(
      (rp) => rp.permissions.name === PERMISSIONS.ADMIN_BYPASS_CAMP_SCOPING,
    ) ?? false
  );
}

/**
 * Extracts a camp ID from URL for routes where :id represents a camp ID.
 *
 * Only /camps/:id uses :id as camp ID — all other camp-scoped routes
 * (inventory, admission) use :campId as the param name, handled by
 * req.params.campId directly.
 *
 * Routes like /resources/:id, /transfers/:id, /expeditions/:id etc. use :id
 * for entity IDs, not camp IDs, so they are intentionally excluded.
 */
function extractCampIdFromUrl(url: string): number | null {
  const pathOnly = url.split('?')[0];
  const match = pathOnly.match(/\/camps\/(\d+)(?:\/|$)/);
  if (!match) return null;
  return match[1] ? Number(match[1]) : null;
}

export const campMiddleware = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const campId = authReq.user?.campId;
    const userId = authReq.user?.userId;

    if (!campId || !userId) {
      throw new AppError('Unauthorized', 401);
    }

    // Admin bypass — re-checked from DB on every request so role changes
    // take effect immediately without requiring a re-login.
    const isAdmin = await hasAdminBypass(userId);
    if (isAdmin) {
      return next();
    }

    const camp = await prisma.camps.findUnique({
      where: { id: campId },
      select: { id: true, status: true },
    });

    if (!camp || camp.status !== 'ACTIVE') {
      throw new AppError('Forbidden', 403);
    }

    const requestedCampParam = req.params.campId;
    if (requestedCampParam !== undefined) {
      const requestedCampId = Number(requestedCampParam);
      if (
        !Number.isInteger(requestedCampId) ||
        requestedCampId <= 0 ||
        requestedCampId !== campId
      ) {
        throw new AppError('Forbidden', 403);
      }
    } else {
      const requestedCampIdFromUrl = extractCampIdFromUrl(req.originalUrl || req.url);
      if (requestedCampIdFromUrl !== null && requestedCampIdFromUrl !== campId) {
        throw new AppError('Forbidden', 403);
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};
