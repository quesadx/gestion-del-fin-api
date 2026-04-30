import { Request, Response } from 'express';
import { createUser, deleteUser, getUsers, getUser, updateUser } from './users.service.js';
import { parseIdParam } from '../../shared/utils/parseIdParam.js';

export async function createUserHandler(req: Request, res: Response) {
  const result = await createUser(req.body);
  return res.status(201).json(result);
}

export async function updateUserHandler(req: Request, res: Response) {
  const id = parseIdParam(req.params.id);
  const result = await updateUser(id, req.body);
  return res.json(result);
}

export async function deleteUserHandler(req: Request, res: Response) {
  const id = parseIdParam(req.params.id);
  await deleteUser(id);
  return res.status(204).send();
}

export async function getUserHandler(req: Request, res: Response) {
  const id = parseIdParam(req.params.id);
  const result = await getUser(id);
  return res.json(result);
}

export async function getUsersHandler(req: Request, res: Response) {
  const result = await getUsers();
  return res.json(result);
}
