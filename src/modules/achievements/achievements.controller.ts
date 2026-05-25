import { Request, Response } from 'express';
import * as service from './achievements.service.js';
import type { AuthenticatedRequest } from '../../middlewares/auth.middleware.js';
import { parseIdParam } from '../../shared/utils/parseIdParam.js';

export async function getMyAchievements(req: Request, res: Response) {
  const authReq = req as AuthenticatedRequest;
  const achievements = await service.getUserAchievements(authReq.user.userId);
  return res.json({
    data: achievements,
    count: achievements.length,
  });
}

export async function getAchievementStats(req: Request, res: Response) {
  const authReq = req as AuthenticatedRequest;
  const stats = await service.getAchievementStatsByRole(authReq.user.role);
  return res.json({
    data: stats,
    count: stats.length,
  });
}

export async function listAchievements(req: Request, res: Response) {
  const achievements = await service.listAchievements();
  return res.json({
    data: achievements,
    count: achievements.length,
  });
}

export async function createAchievement(req: Request, res: Response) {
  const achievement = await service.createAchievement(req.body);
  return res.status(201).json(achievement);
}
