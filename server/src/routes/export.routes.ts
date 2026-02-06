import { Router } from 'express';
import { exportController } from '../controllers/export.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// All export routes require authentication
router.use(authenticate);

// Export single booking as PDF
router.get(
  '/booking/:id/pdf',
  exportController.exportBookingPDF.bind(exportController)
);

// Export filtered bookings as Excel
router.get(
  '/bookings/excel',
  exportController.exportBookingsExcel.bind(exportController)
);

// Export filtered bookings as CSV
router.get(
  '/bookings/csv',
  exportController.exportBookingsCSV.bind(exportController)
);

export { router as exportRouter };
