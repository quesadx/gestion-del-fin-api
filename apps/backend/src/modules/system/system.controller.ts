import { Request, Response } from 'express';
import { getServerTime } from './system.service.js';

export function getServerTimeHandler(req: Request, res: Response) {
  const time = getServerTime();
  return res.json(time);
}
