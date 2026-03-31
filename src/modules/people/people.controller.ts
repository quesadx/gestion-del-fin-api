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

export async function listPeopleHandler(req: Request, res: Response) {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;

  const result = await getPeople(page, limit);
  return res.json(result);
}
