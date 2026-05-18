import { Request, Response } from 'express';
import { parseIdParam } from '../../shared/utils/parseIdParam.js';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware.js';
import {
  approveTransferBySource,
  approveTransferByTarget,
  completeTransfer,
  createTransfer,
  getTransfer,
  getTransfers,
  rejectTransfer,
  scheduleTransferDelivery,
} from './transfers.service.js';

export async function createTransferHandler(req: Request, res: Response) {
  const result = await createTransfer(req.body);
  return res.status(201).json(result);
}

export async function listTransfersHandler(req: Request, res: Response) {
  const authReq = req as AuthenticatedRequest;
  const page = Number(req.query.page) || 1;
  const pageSize = Number(req.query.pageSize) || 20;
  const result = await getTransfers(authReq.user.campId, page, pageSize);
  return res.json(result);
}

export async function getTransferHandler(req: Request, res: Response) {
  const id = parseIdParam(req.params.id);
  const result = await getTransfer(id);
  return res.json(result);
}

export async function scheduleTransferDeliveryHandler(req: Request, res: Response) {
  const authReq = req as AuthenticatedRequest;
  const id = parseIdParam(req.params.id);
  const result = await scheduleTransferDelivery(id, authReq.user.userId, req.body);
  return res.json(result);
}

export async function approveTransferBySourceHandler(req: Request, res: Response) {
  const authReq = req as AuthenticatedRequest;
  const id = parseIdParam(req.params.id);
  const result = await approveTransferBySource(id, authReq.user.userId, req.body);
  return res.json(result);
}

export async function approveTransferByTargetHandler(req: Request, res: Response) {
  const authReq = req as AuthenticatedRequest;
  const id = parseIdParam(req.params.id);
  const result = await approveTransferByTarget(id, authReq.user.userId, req.body);
  return res.json(result);
}

export async function completeTransferHandler(req: Request, res: Response) {
  const authReq = req as AuthenticatedRequest;
  const id = parseIdParam(req.params.id);
  const result = await completeTransfer(id, authReq.user.userId, req.body);
  return res.json(result);
}

export async function rejectTransferHandler(req: Request, res: Response) {
  const authReq = req as AuthenticatedRequest;
  const id = parseIdParam(req.params.id);
  const result = await rejectTransfer(id, authReq.user.userId, req.body);
  return res.json(result);
}
