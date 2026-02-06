import { Router, RequestHandler } from 'express';
import { adminController } from '../controllers/admin.controller.js';
import { validate } from '../middleware/validate.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import {
  createUserSchema,
  updateUserSchema,
  userFilterSchema,
  analyticsQuerySchema,
} from '../validators/admin.validators.js';

const router = Router();

// All admin routes require authentication and admin role
router.use(authenticate, requireAdmin);

// User management
router.get(
  '/users',
  validate(userFilterSchema, 'query'),
  adminController.getUsers.bind(adminController) as unknown as RequestHandler
);

router.get('/users/:id', adminController.getUserById.bind(adminController));

router.post(
  '/users',
  validate(createUserSchema),
  adminController.createUser.bind(adminController)
);

router.patch(
  '/users/:id',
  validate(updateUserSchema),
  adminController.updateUser.bind(adminController)
);

router.delete(
  '/users/:id',
  adminController.deactivateUser.bind(adminController)
);

// Analytics
router.get(
  '/analytics',
  validate(analyticsQuerySchema, 'query'),
  adminController.getAnalytics.bind(adminController) as unknown as RequestHandler
);

// Audit logs
router.get('/audit-logs', adminController.getAuditLogs.bind(adminController));

export { router as adminRouter };
