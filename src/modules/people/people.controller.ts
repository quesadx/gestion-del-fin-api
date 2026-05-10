import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware.js';
import { AppError } from '../../shared/utils/appError.js';
import {
  createContributionOverride,
  createPerson,
  createPersonStatusLog,
  createProfessionReassignment,
  updatePerson,
  deletePerson,
  getPerson,
  getPeople,
} from './people.service.js';
import { parseIdParam } from '../../shared/utils/parseIdParam.js';

export async function createPersonHandler(req: Request, res: Response) {
  const campId = parseIdParam(req.params.campId);
  const result = await createPerson(campId, req.body);
  return res.status(201).json(result);
}

export async function updatePersonHandler(req: Request, res: Response) {
  const campId = parseIdParam(req.params.campId);
  const id = parseIdParam(req.params.id);
  const userId = (req as AuthenticatedRequest).user?.userId;
  if (!userId) {
    throw new AppError('Unauthorized', 401);
  }

  const result = await updatePerson(campId, id, req.body, userId);
  return res.json(result);
}

export async function deletePersonHandler(req: Request, res: Response) {
  const campId = parseIdParam(req.params.campId);
  const id = parseIdParam(req.params.id);
  await deletePerson(campId, id);
  return res.status(204).send();
}

export async function getPersonHandler(req: Request, res: Response) {
  const campId = parseIdParam(req.params.campId);
  const id = parseIdParam(req.params.id);
  const result = await getPerson(campId, id);
  return res.json(result);
}

export async function getPeopleHandler(req: Request, res: Response) {
  const campId = parseIdParam(req.params.campId);
  const page = Number(req.query.page) || 1;
  const pageSize = Number(req.query.pageSize) || 20;
  const result = await getPeople(campId, page, pageSize);
  return res.json(result);
}

export async function createPersonStatusLogHandler(req: Request, res: Response) {
  const campId = parseIdParam(req.params.campId);
  const userId = (req as AuthenticatedRequest).user?.userId;
  if (!userId) {
    throw new AppError('Unauthorized', 401);
  }

  const result = await createPersonStatusLog(campId, req.body, userId);
  return res.status(201).json(result);
}

export async function createProfessionReassignmentHandler(req: Request, res: Response) {
  const campId = parseIdParam(req.params.campId);
  const result = await createProfessionReassignment(campId, req.body);
  return res.status(201).json(result);
}

export async function createContributionOverrideHandler(req: Request, res: Response) {
  const campId = parseIdParam(req.params.campId);
  const userId = (req as AuthenticatedRequest).user?.userId;
  if (!userId) {
    throw new AppError('Unauthorized', 401);
  }

  const result = await createContributionOverride(campId, req.body, userId);
  return res.status(201).json(result);
}
