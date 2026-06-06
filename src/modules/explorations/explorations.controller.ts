import { Request, Response } from 'express';
import {
  createExploration,
  updateExploration,
  updateExpeditionStatus,
  deleteExploration,
  getExploration,
  getExplorations,
} from './explorations.service.js';
import { parseIdParam } from '../../shared/utils/parseIdParam.js';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware.js';

export async function createExplorationHandler(req: Request, res: Response) {
  const authReq = req as AuthenticatedRequest;
  const body = {
    ...req.body,
    camp_id: authReq.user.campId,
    created_by: authReq.user.userId,
  };
  const result = await createExploration(body);
  return res.status(201).json(result);
}

export async function updateExplorationHandler(req: Request, res: Response) {
  const id = parseIdParam(req.params.id);
  const result = await updateExploration(id, req.body);
  return res.json(result);
}

export async function updateExplorationStatusHandler(req: Request, res: Response) {
  const authReq = req as AuthenticatedRequest;
  const id = parseIdParam(req.params.id);
  const body = {
    ...req.body,
    changed_by: authReq.user.userId,
  };
  const result = await updateExpeditionStatus(id, body);
  return res.json(result);
}

export async function deleteExplorationHandler(req: Request, res: Response) {
  const authReq = req as AuthenticatedRequest;
  const id = parseIdParam(req.params.id);
  const body = {
    ...req.body,
    changed_by: authReq.user.userId,
  };
  await deleteExploration(id, body);
  return res.status(204).send();
}

export async function getExplorationHandler(req: Request, res: Response) {
  const id = parseIdParam(req.params.id);
  const result = await getExploration(id);
  return res.json(result);
}

export async function listExplorationsHandler(req: Request, res: Response) {
  const authReq = req as AuthenticatedRequest;
  const page = Number(req.query.page) || 1;
  const pageSize = Number(req.query.pageSize) || 20;
  const queryCampId = Number(req.query.camp_id);
  const campId = queryCampId && authReq.user.isAdmin ? queryCampId : authReq.user.campId;
  const result = await getExplorations(campId, page, pageSize);
  return res.json(result);
}
