import { NextFunction, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../shared/utils/appError.js';
import { AuthenticatedRequest } from './auth.middleware.js';

/**
 * Extracts a camp ID from known URL patterns used by camp-scoped routes.
 *
 * Handles these route families:
 *   - /camps/<id>[/...]           (camp-scoped resource routes)
 *   - /inventory/audit/<id>[/...] (audit routes)
 *   - /inventory/<id>[/...]       (inventory lookup by camp)
 *   - /admission/camps/<id>[/...] (admission by camp)
 *   - /resources/<id>[/...]       (resources scoped to camp)
 *   - /expeditions/<id>[/...]     (expeditions scoped to camp)
 *   - /professions/<id>[/...]     (professions scoped to camp)
 *   - /transfers/<id>[/...]       (transfers scoped to camp)
 *   - /users/<id>[/...]           (users scoped to camp)
 *   - /roles/<id>[/...]           (roles scoped to camp)
 *   - /permissions/<id>[/...]     (permissions scoped to camp)
 *   - /metrics/<id>[/...]         (metrics scoped to camp)
 *
 * Query strings are stripped before matching to avoid false-positive
 * camp ID extraction from user-supplied query parameters.
 */
function extractCampIdFromUrl(url: string): number | null {
  const pathOnly = url.split('?')[0];
  const match = pathOnly.match(
    /\/(?:camps\/(\d+)|inventory\/audit\/(\d+)|inventory\/(\d+)|admission\/camps\/(\d+)|resources\/(\d+)|expeditions\/(\d+)|professions\/(\d+)|transfers\/(\d+)|users\/(\d+)|roles\/(\d+)|permissions\/(\d+)|metrics\/(\d+))(?:\/|$)/,
  );
  if (!match) return null;
  const id =
    match[1] ||
    match[2] ||
    match[3] ||
    match[4] ||
    match[5] ||
    match[6] ||
    match[7] ||
    match[8] ||
    match[9] ||
    match[10] ||
    match[11] ||
    match[12];
  return id ? Number(id) : null;
}

export const campMiddleware = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const campId = authReq.user?.campId;
    const isAdmin = authReq.user?.isAdmin;

    if (!campId) {
      throw new AppError('Unauthorized', 401);
    }

    // Admin bypass — skip camp validation entirely.
    // Uses isAdmin from JWT (set at login) so role renames don't break access.
    if (isAdmin) {
      return next();
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
    } else {
      const requestedCampIdFromUrl = extractCampIdFromUrl(req.originalUrl || req.url);
      if (requestedCampIdFromUrl !== null && requestedCampIdFromUrl !== campId) {
        throw new AppError('Unauthorized', 401);
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};
