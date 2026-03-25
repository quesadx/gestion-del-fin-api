import { Router } from 'express';
import * as campsController from './camps.controller.js';

const router = Router();

router.post('/', campsController.createCampHandler);
router.get('/', campsController.listCampsHandler);
router.get('/:id', campsController.getCampHandler);
router.put('/:id', campsController.updateCampHandler);
router.delete('/:id', campsController.deleteCampHandler);

export default router;
