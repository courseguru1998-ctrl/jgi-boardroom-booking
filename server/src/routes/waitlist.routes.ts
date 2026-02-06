import { Router } from 'express';
import { waitlistController } from '../controllers/waitlist.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Add to waitlist
router.post('/', waitlistController.addToWaitlist.bind(waitlistController));

// Get user's waitlist entries
router.get('/my', waitlistController.getMyWaitlist.bind(waitlistController));

// Check if on waitlist
router.get('/check', waitlistController.isOnWaitlist.bind(waitlistController));

// Remove from waitlist
router.delete('/:id', waitlistController.removeFromWaitlist.bind(waitlistController));

export { router as waitlistRouter };
