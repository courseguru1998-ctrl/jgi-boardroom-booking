import { Router } from 'express';
import { checkInController } from '../controllers/checkin.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Check in to a booking
router.post('/', checkInController.checkIn.bind(checkInController));

// Get current user's check-ins for today
router.get('/my/today', checkInController.getMyCheckInsToday.bind(checkInController));

// Get check-in status for a booking
router.get(
  '/booking/:bookingId',
  checkInController.getCheckInStatus.bind(checkInController)
);

// Check if current user is checked in to a booking
router.get(
  '/booking/:bookingId/me',
  checkInController.isCheckedIn.bind(checkInController)
);

export { router as checkInRouter };
