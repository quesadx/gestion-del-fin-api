import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware.js';
import { AppError } from '../../shared/utils/appError.js';
import { parseIdParam } from '../../shared/utils/parseIdParam.js';
import * as Service from './inventory-adjustment-requests.service.js';

export async function create(req: Request, res: Response) {
  const authReq = req as AuthenticatedRequest;
  const userId = authReq.user?.userId;

  if (!userId) {
    throw new AppError('Unauthorized', 401);
  }

  const result = await Service.createRequest(req.body, userId);
  return res.status(201).json(result);
}

export async function getMy(req: Request, res: Response) {
  const authReq = req as AuthenticatedRequest;
  const userId = authReq.user?.userId;
  const campId = authReq.user?.campId;

  if (!userId || !campId) {
    throw new AppError('Unauthorized', 401);
  }

  const result = await Service.getMyRequests(userId, campId);
  return res.json(result);
}

export async function getAll(req: Request, res: Response) {
  const authReq = req as AuthenticatedRequest;
  const campId = authReq.user?.campId;

  if (!campId) {
    throw new AppError('Unauthorized', 401);
  }

  const result = await Service.getAllRequests(campId);
  return res.json(result);
}

export async function approve(req: Request, res: Response) {
  const authReq = req as AuthenticatedRequest;
  const userId = authReq.user?.userId;
  const requestId = parseIdParam(req.params.id);

  if (!userId) {
    throw new AppError('Unauthorized', 401);
  }

  const result = await Service.approveRequest(requestId, userId);
  return res.json(result);
}

export async function reject(req: Request, res: Response) {
  const authReq = req as AuthenticatedRequest;
  const userId = authReq.user?.userId;
  const requestId = parseIdParam(req.params.id);

  if (!userId) {
    throw new AppError('Unauthorized', 401);
  }

  const result = await Service.rejectRequest(requestId, userId);
  return res.json(result);
}
