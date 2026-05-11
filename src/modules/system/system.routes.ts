import { Router } from 'express';
import { getServerTimeHandler } from './system.controller.js';

const router = Router();

router.get('/time', getServerTimeHandler);

export default router;
