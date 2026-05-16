import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware.js';
import { AppError } from '../../shared/utils/appError.js';
import { SYSTEM_ADMIN } from '../../shared/constants/roles.js';
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
  const userRole = authReq.user?.role;
  const userCampId = authReq.user?.campId;

  if (!userId) {
    throw new AppError('Unauthorized', 401);
  }

  // Prevent cross-camp tampering via body camp_id for non-admin users
  if (userRole !== SYSTEM_ADMIN && req.body.camp_id !== userCampId) {
    throw new AppError('Unauthorized: cannot modify another camp', 401);
  }

  const result = await createManualAdjustment(req.body, userId);
  return res.status(201).json(result);
}
