import { Router, RequestHandler } from 'express';
import { roomController } from '../controllers/room.controller.js';
import { validate } from '../middleware/validate.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import {
  createRoomSchema,
  updateRoomSchema,
  roomFilterSchema,
  roomAvailabilitySchema,
} from '../validators/room.validators.js';

const router = Router();

// Public routes (authenticated users can view)
router.get(
  '/',
  authenticate,
  validate(roomFilterSchema, 'query'),
  roomController.findAll.bind(roomController) as unknown as RequestHandler
);

router.get('/:id', authenticate, roomController.findById.bind(roomController));

router.get(
  '/:id/availability',
  authenticate,
  validate(roomAvailabilitySchema, 'query'),
  roomController.getAvailability.bind(roomController)
);

// Admin routes
router.post(
  '/',
  authenticate,
  requireAdmin,
  validate(createRoomSchema),
  roomController.create.bind(roomController)
);

router.patch(
  '/:id',
  authenticate,
  requireAdmin,
  validate(updateRoomSchema),
  roomController.update.bind(roomController)
);

router.delete(
  '/:id',
  authenticate,
  requireAdmin,
  roomController.delete.bind(roomController)
);

export { router as roomRouter };
