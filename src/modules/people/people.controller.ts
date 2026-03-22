import { Request, Response } from 'express';
import {
  createPerson,
  updatePerson,
  deletePerson,
  getPerson,
  getPeople,
} from './people.service.js';

export async function createPersonHandler(req: Request, res: Response) {
  try {
    const person = await createPerson(req.body);
    return res.status(201).json(person);
  } catch (error) {
    return res
      .status(500)
      .json({ error: error instanceof Error ? error.message : 'Internal server error' });
  }
}

export async function updatePersonHandler(req: Request, res: Response) {
  const id = Number(req.params.id);
  try {
    const person = await updatePerson(id, req.body);
    return res.json(person);
  } catch (error) {
    return res
      .status(500)
      .json({ error: error instanceof Error ? error.message : 'Internal server error' });
  }
}

export async function deletePersonHandler(req: Request, res: Response) {
  const id = Number(req.params.id);
  try {
    await deletePerson(id);
    return res.status(204).send();
  } catch (error) {
    return res
      .status(500)
      .json({ error: error instanceof Error ? error.message : 'Internal server error' });
  }
}

export async function getPersonHandler(req: Request, res: Response) {
  const id = Number(req.params.id);
  try {
    const person = await getPerson(id);
    if (!person) return res.status(404).json({ error: 'Person not found' });
    return res.json(person);
  } catch (error) {
    return res
      .status(500)
      .json({ error: error instanceof Error ? error.message : 'Internal server error' });
  }
}

export async function listPeopleHandler(req: Request, res: Response) {
  try {
    const people = await getPeople();
    return res.json(people);
  } catch (error) {
    return res
      .status(500)
      .json({ error: error instanceof Error ? error.message : 'Internal server error' });
  }
}
