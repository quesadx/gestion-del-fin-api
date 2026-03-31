import { Router } from 'express';
import {
  createPersonHandler,
  updatePersonHandler,
  deletePersonHandler,
  getPersonHandler,
  getPeopleHandler,
} from './people.controller.js';
import { createPersonSchema, updatePersonSchema } from './people.schema.js';
import { validate } from '../../middlewares/validate.middleware.js';

const router = Router();

router.post('/', validate(createPersonSchema), createPersonHandler);
router.get('/', getPeopleHandler);
router.get('/:id', getPersonHandler);
router.put('/:id', validate(updatePersonSchema), updatePersonHandler);
router.delete('/:id', deletePersonHandler);

export default router;
