import { Request, Response } from 'express';
import {
  createPerson,
  updatePerson,
  deletePerson,
  getPerson,
  getPeople,
} from './people.service.js';
import { parseIdParam } from '../../shared/utils/parseIdParam.js';

export async function createPersonHandler(req: Request, res: Response) {
  const result = await createPerson(req.body);
  return res.status(201).json(result);
}

export async function updatePersonHandler(req: Request, res: Response) {
  const id = parseIdParam(req.params.id);
  const result = await updatePerson(id, req.body);
  return res.json(result);
}

export async function deletePersonHandler(req: Request, res: Response) {
  const id = parseIdParam(req.params.id);
  await deletePerson(id);
  return res.status(204).send();
}

export async function getPersonHandler(req: Request, res: Response) {
  const id = parseIdParam(req.params.id);
  const result = await getPerson(id);
  return res.json(result);
}

export async function getPeopleHandler(req: Request, res: Response) {
  const { page, limit } = req.query as unknown as { page: number; limit: number };
  const result = await getPeople(page, limit);
  return res.json(result);
}
