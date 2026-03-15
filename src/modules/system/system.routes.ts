import express from 'express';
import { getServerTimeHandler } from './system.controller.js';

export const systemRoutes = express.Router();
systemRoutes.get('/time', getServerTimeHandler);
