import { Router } from 'express';
import { z } from 'zod';
import * as professionsController from './professions.controller.js';
import { createProfessionSchema, updateProfessionSchema } from './professions.schema.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { idParamsSchema } from '../../shared/schemas/http.schema.js';

const router = Router();

router.post(
	'/',
	validate(z.object({ body: createProfessionSchema })),
	professionsController.createProfessionHandler,
);
router.get('/', professionsController.listProfessionsHandler);
router.get(
	'/:id',
	validate(z.object({ params: idParamsSchema })),
	professionsController.getProfessionHandler,
);
router.put(
	'/:id',
	validate(z.object({ params: idParamsSchema, body: updateProfessionSchema })),
	professionsController.updateProfessionHandler,
);
router.delete(
	'/:id',
	validate(z.object({ params: idParamsSchema })),
	professionsController.deleteProfessionHandler,
);

export default router;
