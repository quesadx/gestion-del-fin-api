import { Router } from 'express';
import * as campsController from './camps.controller.js';
import { createCampSchema, updateCampSchema } from './camps.schema.js';
import { validate } from '../../middlewares/validate.middleware.js';

const router = Router();

router.post('/', validate(createCampSchema), campsController.createCampHandler);
router.get('/', campsController.listCampsHandler);
router.get('/:id', campsController.getCampHandler);
router.put('/:id', validate(updateCampSchema), campsController.updateCampHandler);
router.delete('/:id', campsController.deleteCampHandler);

export default router;
