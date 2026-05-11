import { Request, Response } from 'express';
import {
  createProfession,
  updateProfession,
  deleteProfession,
  getProfession,
  getProfessions,
} from './professions.service.js';
import { parseIdParam } from '../../shared/utils/parseIdParam.js';

export async function createProfessionHandler(req: Request, res: Response) {
  const result = await createProfession(req.body);
  return res.status(201).json(result);
}

export async function updateProfessionHandler(req: Request, res: Response) {
  const id = parseIdParam(req.params.id);
  const result = await updateProfession(id, req.body);
  return res.json(result);
}

export async function deleteProfessionHandler(req: Request, res: Response) {
  const id = parseIdParam(req.params.id);
  await deleteProfession(id);
  return res.status(204).send();
}

export async function getProfessionHandler(req: Request, res: Response) {
  const id = parseIdParam(req.params.id);
  const result = await getProfession(id);
  return res.json(result);
}

export async function listProfessionsHandler(req: Request, res: Response) {
  const page = Number(req.query.page) || 1;
  const pageSize = Number(req.query.pageSize) || 20;
  const result = await getProfessions(page, pageSize);
  return res.json(result);
}
