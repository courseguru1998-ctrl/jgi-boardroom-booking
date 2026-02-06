import { Router } from 'express';
import { calendarController } from '../controllers/calendar.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Get connected calendars
router.get(
  '/connections',
  authenticate,
  calendarController.getConnections.bind(calendarController)
);

// OAuth initiation (requires auth)
router.get(
  '/connect/:provider',
  authenticate,
  calendarController.connect.bind(calendarController)
);

// OAuth callback (no auth, comes from external provider)
router.get(
  '/callback/:provider',
  calendarController.callback.bind(calendarController)
);

// Disconnect calendar
router.delete(
  '/disconnect/:provider',
  authenticate,
  calendarController.disconnect.bind(calendarController)
);

export { router as calendarRouter };
