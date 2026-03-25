import express from 'express';
import {
  createPersonHandler,
  updatePersonHandler,
  deletePersonHandler,
  getPersonHandler,
  listPeopleHandler,
} from './people.controller.js';
import { createPersonSchema, updatePersonSchema } from './people.schema.js';
import { validate } from '../../middlewares/validate.middleware.js';

const router = express.Router();

router.post('/', validate(createPersonSchema), createPersonHandler);
router.get('/', listPeopleHandler);
router.get('/:id', getPersonHandler);
router.put('/:id', validate(updatePersonSchema), updatePersonHandler);
router.delete('/:id', deletePersonHandler);

export const peopleRoutes = router;
