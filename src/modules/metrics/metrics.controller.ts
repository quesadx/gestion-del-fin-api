import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware.js';
import { getDashboard, getResources, getPeople, getExpeditions } from './metrics.service.js';

export async function getDashboardHandler(req: Request, res: Response) {
  const campId = (req as AuthenticatedRequest).user.campId;
  const result = await getDashboard(campId);
  return res.json(result);
}

export async function getResourcesHandler(req: Request, res: Response) {
  const campId = (req as AuthenticatedRequest).user.campId;
  const result = await getResources(campId);
  return res.json(result);
}

export async function getPeopleHandler(req: Request, res: Response) {
  const campId = (req as AuthenticatedRequest).user.campId;
  const result = await getPeople(campId);
  return res.json(result);
}

export async function getExpeditionsHandler(req: Request, res: Response) {
  const campId = (req as AuthenticatedRequest).user.campId;
  const result = await getExpeditions(campId);
  return res.json(result);
}
