import { Router, RequestHandler } from 'express';
import { bookingController } from '../controllers/booking.controller.js';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import {
  createBookingSchema,
  updateBookingSchema,
  bookingFilterSchema,
} from '../validators/booking.validators.js';

const router = Router();

// All booking routes require authentication
router.use(authenticate);

router.get(
  '/',
  validate(bookingFilterSchema, 'query'),
  bookingController.findAll.bind(bookingController) as unknown as RequestHandler
);

router.get(
  '/my',
  validate(bookingFilterSchema, 'query'),
  bookingController.findMyBookings.bind(bookingController) as unknown as RequestHandler
);

router.get('/:id', bookingController.findById.bind(bookingController));

router.post(
  '/',
  validate(createBookingSchema),
  bookingController.create.bind(bookingController)
);

router.patch(
  '/:id',
  validate(updateBookingSchema),
  bookingController.update.bind(bookingController)
);

router.delete('/:id', bookingController.cancel.bind(bookingController));

export { router as bookingRouter };
