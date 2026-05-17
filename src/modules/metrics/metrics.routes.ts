import { Router } from 'express';
import {
  getDashboardHandler,
  getResourcesHandler,
  getPeopleHandler,
  getExpeditionsHandler,
} from './metrics.controller.js';
import { permissionMiddleware } from '../../middlewares/permission.middleware.js';
import { PERMISSIONS } from '../../shared/constants/permissions.js';

const router = Router();

router.get('/dashboard', permissionMiddleware(PERMISSIONS.METRICS_DASHBOARD), getDashboardHandler);

router.get('/resources', permissionMiddleware(PERMISSIONS.METRICS_RESOURCES), getResourcesHandler);

router.get('/people', permissionMiddleware(PERMISSIONS.METRICS_PEOPLE), getPeopleHandler);

router.get(
  '/expeditions',
  permissionMiddleware(PERMISSIONS.METRICS_EXPEDITIONS),
  getExpeditionsHandler,
);

export default router;
