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
//Create person
router.post('/', validate(createPersonSchema), createPersonHandler);
// Get people list
router.get('/', listPeopleHandler);
// Get person by ID
router.get('/:id', getPersonHandler);
// Update person
router.put('/:id', validate(updatePersonSchema), updatePersonHandler);
// Delete person
router.delete('/:id', deletePersonHandler);

export const peopleRoutes = router;
