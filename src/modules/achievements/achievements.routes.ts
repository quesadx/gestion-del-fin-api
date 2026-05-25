import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { campMiddleware } from '../../middlewares/camp.middleware.js';
import { permissionMiddleware } from '../../middlewares/permission.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import * as controller from './achievements.controller.js';
import { achievementSchema } from './achievements.schema.js';
import { PERMISSIONS } from '../../shared/constants/permissions.js';

export const achievementsRouter = Router();

// GET /api/achievements/my-achievements - My unlocked achievements
achievementsRouter.get(
  '/my-achievements',
  authMiddleware,
  campMiddleware,
  controller.getMyAchievements,
);

// GET /api/achievements/stats - Achievement statistics by role
achievementsRouter.get(
  '/stats',
  authMiddleware,
  campMiddleware,
  permissionMiddleware(PERMISSIONS.METRICS_DASHBOARD),
  controller.getAchievementStats,
);

// GET /api/achievements - List all achievements (admin)
achievementsRouter.get(
  '/',
  authMiddleware,
  campMiddleware,
  permissionMiddleware(PERMISSIONS.ADMIN_BYPASS_CAMP_SCOPING),
  controller.listAchievements,
);

// POST /api/achievements - Create achievement (admin)
achievementsRouter.post(
  '/',
  authMiddleware,
  campMiddleware,
  permissionMiddleware(PERMISSIONS.ADMIN_BYPASS_CAMP_SCOPING),
  validate(
    achievementSchema.omit({ id: true, created_at: true, updated_at: true, deleted_at: true }),
  ),
  controller.createAchievement,
);
