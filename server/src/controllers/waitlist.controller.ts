import { Request, Response, NextFunction } from 'express';
import { waitlistService } from '../services/waitlist.service.js';

interface AddToWaitlistBody {
  roomId: string;
  startTime: string;
  endTime: string;
}

export class WaitlistController {
  /**
   * Add user to waitlist
   */
  async addToWaitlist(
    req: Request<object, object, AddToWaitlistBody>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!.id;
      const { roomId, startTime, endTime } = req.body;

      const entry = await waitlistService.addToWaitlist(
        roomId,
        userId,
        new Date(startTime),
        new Date(endTime)
      );

      res.status(201).json({
        success: true,
        message: 'Added to waitlist successfully',
        data: entry,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Remove from waitlist
   */
  async removeFromWaitlist(
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!.id;

      await waitlistService.removeFromWaitlist(req.params.id, userId);

      res.json({
        success: true,
        message: 'Removed from waitlist',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user's waitlist entries
   */
  async getMyWaitlist(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!.id;

      const entries = await waitlistService.getMyWaitlist(userId);

      res.json({
        success: true,
        data: entries,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Check if user is on waitlist for a slot
   */
  async isOnWaitlist(
    req: Request<object, object, object, { roomId: string; startTime: string; endTime: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!.id;
      const { roomId, startTime, endTime } = req.query;

      const isOnWaitlist = await waitlistService.isOnWaitlist(
        roomId,
        userId,
        new Date(startTime),
        new Date(endTime)
      );

      res.json({
        success: true,
        data: { isOnWaitlist },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const waitlistController = new WaitlistController();
