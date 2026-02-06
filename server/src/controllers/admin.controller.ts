import { Request, Response, NextFunction } from 'express';
import { adminService } from '../services/admin.service.js';
import type {
  CreateUserInput,
  UpdateUserInput,
  UserFilterInput,
  AnalyticsQueryInput,
} from '../validators/admin.validators.js';

export class AdminController {
  async createUser(
    req: Request<object, object, CreateUserInput>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const user = await adminService.createUser(req.body);

      res.status(201).json({
        success: true,
        message: 'User created successfully',
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  async getUsers(
    req: Request<object, object, object, UserFilterInput>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await adminService.getUsers(req.query);

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  async getUserById(
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const user = await adminService.getUserById(req.params.id);

      res.json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateUser(
    req: Request<{ id: string }, object, UpdateUserInput>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const user = await adminService.updateUser(req.params.id, req.body);

      res.json({
        success: true,
        message: 'User updated successfully',
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  async deactivateUser(
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const user = await adminService.deactivateUser(req.params.id);

      res.json({
        success: true,
        message: 'User deactivated successfully',
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  async getAnalytics(
    req: Request<object, object, object, AnalyticsQueryInput>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const analytics = await adminService.getAnalytics(req.query);

      res.json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      next(error);
    }
  }

  async getAuditLogs(
    req: Request<object, object, object, { page?: string; limit?: string; entityType?: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const page = parseInt(req.query.page || '1', 10);
      const limit = parseInt(req.query.limit || '50', 10);
      const { entityType } = req.query;

      const result = await adminService.getAuditLogs(page, limit, entityType);

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const adminController = new AdminController();
