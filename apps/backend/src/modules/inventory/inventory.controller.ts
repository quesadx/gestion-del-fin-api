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
  const result = await getCampInventory(campId);
  return res.json(result);
}

export async function getInventoryAuditHandler(req: Request, res: Response) {
  const campId = parseIdParam(req.params.campId);
  const result = await getInventoryAudit(campId);
  return res.json(result);
}

export async function manualAdjustmentHandler(req: Request, res: Response) {
  const userId = (req as AuthenticatedRequest).user?.userId;

  if (!userId) {
    throw new AppError('Unauthorized', 401);
  }

  const result = await createManualAdjustment(req.body, userId);
  return res.status(201).json(result);
}
