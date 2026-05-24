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
 * Extracts a camp ID from URL patterns that genuinely embed a camp ID.
 *
 * Only these route families contain a camp ID in the URL path:
 *   - /camps/<id>[/...]           (camp-scoped resource routes)
 *   - /inventory/audit/<id>[/...] (audit routes)
 *   - /inventory/<id>[/...]       (inventory lookup by camp)
 *   - /admission/camps/<id>[/...] (admission by camp)
 *
 * All other resource routes (expeditions, transfers, professions, users,
 * roles, permissions, etc.) use resource-specific IDs — not camp IDs.
 * For those routes, camp scoping is handled by the service layer via
 * database queries on the resource's camp_id.
 *
 * Query strings are stripped before matching to avoid false-positive
 * camp ID extraction from user-supplied query parameters.
 */
function extractCampIdFromUrl(url: string): number | null {
  const pathOnly = url.split('?')[0];
  // Only match paths that genuinely embed a camp ID
  const match = pathOnly.match(
    /\/(?:camps\/(\d+)|inventory\/audit\/(\d+)|inventory\/(\d+)|admission\/camps\/(\d+))(?:\/|$)/,
  );
  if (!match) return null;
  return Number(match[1] || match[2] || match[3] || match[4]) || null;
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
      // No camp ID in URL — service layer will handle scoping via DB queries
      if (requestedCampIdFromUrl === null) {
        return next();
      }
      if (requestedCampIdFromUrl !== campId) {
        throw new AppError('Forbidden', 403);
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};
