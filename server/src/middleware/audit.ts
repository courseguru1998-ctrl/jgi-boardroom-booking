import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database.js';

interface AuditOptions {
  action: string;
  entityType: string;
  getEntityId?: (req: Request) => string | undefined;
  getOldValue?: (req: Request) => unknown;
  getNewValue?: (req: Request, res: Response) => unknown;
}

export function audit(options: AuditOptions) {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    // Store original json method
    const originalJson = res.json.bind(res);

    // Override json to capture response
    res.json = function (body: unknown) {
      // Log audit after response
      setImmediate(async () => {
        try {
          const oldValue = options.getOldValue?.(req);
          const newValue = options.getNewValue?.(req, res) ?? body;

          await prisma.auditLog.create({
            data: {
              userId: req.user?.userId,
              action: options.action,
              entityType: options.entityType,
              entityId: options.getEntityId?.(req),
              oldValue: oldValue ? JSON.stringify(oldValue) : null,
              newValue: newValue ? JSON.stringify(newValue) : null,
              ipAddress:
                req.ip || req.socket.remoteAddress || req.headers['x-forwarded-for']?.toString(),
              userAgent: req.headers['user-agent'],
            },
          });
        } catch (error) {
          console.error('Failed to create audit log:', error);
        }
      });

      return originalJson(body);
    };

    next();
  };
}
