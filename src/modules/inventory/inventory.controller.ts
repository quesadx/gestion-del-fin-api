import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware.js';
import { AppError } from '../../shared/utils/appError.js';
import {
  getCampInventory,
  createManualAdjustment,
  getInventoryAudit,
} from './inventory.service.js';
import { parseIdParam } from '../../shared/utils/parseIdParam.js';

export async function getCampInventoryHandler(req: Request, res: Response) {
  const campId = parseIdParam(req.params.campId);
  const page = Number(req.query.page) || 1;
  const pageSize = Number(req.query.pageSize) || 20;
  const result = await getCampInventory(campId, page, pageSize);
  return res.json(result);
}

export async function getInventoryAuditHandler(req: Request, res: Response) {
  const campId = parseIdParam(req.params.campId);
  const page = Number(req.query.page) || 1;
  const pageSize = Number(req.query.pageSize) || 20;
  const result = await getInventoryAudit(campId, page, pageSize);
  return res.json(result);
}

export async function manualAdjustmentHandler(req: Request, res: Response) {
  const authReq = req as AuthenticatedRequest;
  const userId = authReq.user?.userId;
  // Use DB-verified admin bypass status (set by campMiddleware) instead of
  // the stale JWT isAdmin flag which may be outdated after permission revocation.
  const hasAdminBypass = !!(req as any)._hasAdminBypass;

  if (!userId) {
    throw new AppError('Unauthorized', 401);
  }

  // Prevent cross-camp tampering via body camp_id for non-admin users
  if (!hasAdminBypass && req.body.camp_id !== authReq.user?.campId) {
    throw new AppError('Forbidden: cannot modify another camp', 403);
  }

  const result = await createManualAdjustment(req.body, userId);
  return res.status(201).json(result);
}
