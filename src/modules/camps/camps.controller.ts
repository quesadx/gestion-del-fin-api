import { Request, Response } from 'express';
import { createCamp, updateCamp, deleteCamp, getCamp, getCamps } from './camps.service.js';
import { parseIdParam } from '../../shared/utils/parseIdParam.js';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware.js';

export async function createCampHandler(req: Request, res: Response) {
  const authReq = req as AuthenticatedRequest;
  const result = await createCamp(req.body, authReq.user.userId, authReq.user.campId);
  return res.status(201).json(result);
}

export async function updateCampHandler(req: Request, res: Response) {
  const authReq = req as AuthenticatedRequest;
  const id = parseIdParam(req.params.id);
  const result = await updateCamp(id, req.body, authReq.user.userId, authReq.user.campId);
  return res.json(result);
}

export async function deleteCampHandler(req: Request, res: Response) {
  const authReq = req as AuthenticatedRequest;
  const id = parseIdParam(req.params.id);
  await deleteCamp(id, authReq.user.userId, authReq.user.campId);
  return res.status(204).send();
}

export async function getCampHandler(req: Request, res: Response) {
  const id = parseIdParam(req.params.id);
  const result = await getCamp(id);
  return res.json(result);
}

export async function getCampsHandler(req: Request, res: Response) {
  const authReq = req as AuthenticatedRequest;
  const page = Number(req.query.page) || 1;
  const pageSize = Number(req.query.pageSize) || 20;
  const result = await getCamps(page, pageSize, authReq.user.campId, authReq.user.isAdmin);
  return res.json(result);
}
