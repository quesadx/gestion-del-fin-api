import { Request, Response } from 'express';
import { createCamp, updateCamp, deleteCamp, getCamp, getCamps } from './camps.service.js';
import { parseIdParam } from '../../shared/utils/parseIdParam.js';

export async function createCampHandler(req: Request, res: Response) {
  const result = await createCamp(req.body);
  return res.status(201).json(result);
}

export async function updateCampHandler(req: Request, res: Response) {
  const id = parseIdParam(req.params.id);
  const result = await updateCamp(id, req.body);
  return res.json(result);
}

export async function deleteCampHandler(req: Request, res: Response) {
  const id = parseIdParam(req.params.id);
  await deleteCamp(id);
  return res.status(204).send();
}

export async function getCampHandler(req: Request, res: Response) {
  const id = parseIdParam(req.params.id);
  const result = await getCamp(id);
  return res.json(result);
}

export async function getCampsHandler(req: Request, res: Response) {
  const result = await getCamps();
  return res.json(result);
}
