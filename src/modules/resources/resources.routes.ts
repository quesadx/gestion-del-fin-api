import { Router } from 'express';
import * as resourcesController from './resources.controller.js';
import { createResourceSchema, updateResourceSchema } from './resources.schema.js';
import { validate } from '../../middlewares/validate.middleware.js';

const router = Router();

router.post('/', validate(createResourceSchema), resourcesController.createResourceHandler);
router.get('/', resourcesController.listResourcesHandler);
router.get('/:id', resourcesController.getResourceHandler);
router.put('/:id', validate(updateResourceSchema), resourcesController.updateResourceHandler);
router.delete('/:id', resourcesController.deleteResourceHandler);

export default router;
