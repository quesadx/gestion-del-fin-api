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

export async function createExplorationHandler(req: Request, res: Response) {
  const result = await createExploration(req.body);
  return res.status(201).json(result);
}

export async function updateExplorationHandler(req: Request, res: Response) {
  const id = parseIdParam(req.params.id);
  const result = await updateExploration(id, req.body);
  return res.json(result);
}

export async function updateExplorationStatusHandler(req: Request, res: Response) {
  const id = parseIdParam(req.params.id);
  const result = await updateExpeditionStatus(id, req.body);
  return res.json(result);
}

export async function deleteExplorationHandler(req: Request, res: Response) {
  const id = parseIdParam(req.params.id);
  await deleteExploration(id);
  return res.status(204).send();
}

export async function getExplorationHandler(req: Request, res: Response) {
  const id = parseIdParam(req.params.id);
  const result = await getExploration(id);
  return res.json(result);
}

export async function listExplorationsHandler(req: Request, res: Response) {
  const result = await getExplorations();
  return res.json(result);
}
